const path = require('path');
const CG = require('console-grid');
const EC = require('eight-colors');
const Util = require('../utils/util.js');
const { getV8Summary } = require('./v8-summary.js');
const { dedupeFlatRanges } = require('../utils/dedupe.js');
const { getSourcePath, getSourcePathHandler } = require('../utils/source-path.js');
const { mergeScriptCovs, minimatch } = require('../packages/monocart-coverage-vendor.js');
const { collectSourceMaps } = require('../converter/collect-source-maps.js');
const version = require('../../package.json').version;

const getWrapperSource = (offset, source) => {
    // NO \n because it break line number in mappings
    let startStr = '';
    if (offset >= 4) {
        // fill comments
        const spaces = ''.padEnd(offset - 4, '*');
        startStr = `/*${spaces}*/`;
    } else {
        // fill spaces (should no chance)
        startStr += ''.padEnd(offset, ' ');
    }
    return startStr + source;
};

const getEntryFilter = (options) => {
    const entryFilter = options.entryFilter;
    if (typeof entryFilter === 'function') {
        return entryFilter;
    }

    if (entryFilter && typeof entryFilter === 'string') {
        return (entry) => {
            return minimatch(entry.url, entryFilter);
        };
    }

    return () => true;
};

const initV8ListAndSourcemap = async (v8list, options) => {

    // entry filter
    const entryFilter = getEntryFilter(options);

    // filter no source or text
    // init type and css source from text
    // keep functions
    v8list = v8list.filter((item) => {

        // filter entry
        if (!entryFilter(item)) {
            // console.log('-', item.url);
            return false;
        }
        // console.log(item.url);

        if (typeof item.source === 'string' && item.functions) {
            item.type = 'js';
            return true;
        }
        if (typeof item.text === 'string' && item.ranges) {
            item.type = 'css';
            return true;
        }
        // allow empty coverage
        if (item.empty) {
            if (!['js', 'css'].includes(item.type)) {
                item.type = 'js';
            }
            return true;
        }
        // 404 css, text will be empty
        // Util.logError(`Invalid source: ${item.url}`);
        // console.log(item);
    });


    // do not change original v8list, to work for multiple APIs

    const sourcePathHandler = getSourcePathHandler(options);

    // init id, sourcePath
    v8list = v8list.map((item, i) => {

        // it could be a empty file
        let source = `${item.source || item.text || ''}`;

        // fix source with script offset
        let scriptOffset;
        const offset = Util.toNum(item.scriptOffset, true);
        if (offset > 0) {
            scriptOffset = offset;
            source = getWrapperSource(offset, source);
        }

        const data = {
            url: item.url,
            type: item.type,
            source,
            // script offset >= 0, for vm script
            scriptOffset,
            // Manually Resolve the Sourcemap
            sourceMap: item.sourceMap,
            // fake source with `lineLengths`
            fake: item.fake,
            // empty coverage
            empty: item.empty,
            // match source if using empty coverage
            distFile: item.distFile
        };

        // coverage
        if (data.type === 'js') {
            data.functions = item.functions;
        } else {
            data.ranges = item.ranges;
        }

        // resolve source path
        let sourcePath = getSourcePath(data.url, i + 1, data.type);
        if (sourcePathHandler) {
            const newSourcePath = sourcePathHandler(sourcePath, data.url);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }
        data.sourcePath = sourcePath;

        // calculate source id
        data.id = Util.calculateSha1(sourcePath + data.source);

        return data;
    });

    // collect sourcemap first
    const time_start = Date.now();
    const smList = await collectSourceMaps(v8list, options);
    if (smList.length) {
        // debug level time
        Util.logTime(`loaded sourcemaps: ${smList.length}`, time_start);
        // console.log(smList);
    }

    return v8list;
};

// ========================================================================================================

// force to async
const mergeCssRanges = (itemList) => {
    return new Promise((resolve) => {

        let concatRanges = [];
        itemList.forEach((item) => {
            concatRanges = concatRanges.concat(item.ranges);
        });

        // ranges: [ {start, end} ]
        const ranges = dedupeFlatRanges(concatRanges);

        resolve(ranges || []);
    });
};

const mergeJsFunctions = (itemList) => {
    return new Promise((resolve) => {

        const res = mergeScriptCovs(itemList);
        const functions = res && res.functions;

        resolve(functions || []);
    });
};

const mergeV8Coverage = async (dataList, sourceCache, options) => {

    let allList = [];
    dataList.forEach((d) => {
        allList = allList.concat(d.data);
    });

    // remove empty items
    const coverageList = allList.filter((it) => !it.empty);

    // connect all functions and ranges
    const itemMap = {};
    const mergeMap = {};
    coverageList.forEach((item) => {
        const { id } = item;
        const prev = itemMap[id];
        if (prev) {
            if (mergeMap[id]) {
                mergeMap[id].push(item);
            } else {
                mergeMap[id] = [prev, item];
            }
        } else {
            itemMap[id] = item;
        }
    });

    // merge functions and ranges
    const mergeIds = Object.keys(mergeMap);
    for (const id of mergeIds) {
        const itemList = mergeMap[id];
        const item = itemMap[id];
        if (item.type === 'js') {
            item.functions = await mergeJsFunctions(itemList);
        } else {
            item.ranges = await mergeCssRanges(itemList);
        }
    }

    // first time filter for empty, (not for sources)
    // empty and not in item map
    const emptyList = allList.filter((it) => it.empty).filter((it) => !itemMap[it.id]);

    // empty list + merged list
    const mergedList = emptyList.concat(Object.values(itemMap));

    // try to load coverage and source by id
    for (const item of mergedList) {
        const {
            id, type, empty
        } = item;
        const json = sourceCache.get(id);
        if (json) {
            item.source = json.source;
            item.sourceMap = json.sourceMap;
        } else {
            Util.logError(`Not found source data: ${Util.relativePath(item.sourcePath)}`);
            item.source = '';
        }

        // add empty coverage after merged
        if (empty) {
            if (type === 'js') {
                item.functions = [{
                    functionName: '',
                    ranges: [{
                        startOffset: 0,
                        endOffset: item.source.length,
                        count: 0
                    }]
                }];
            } else {
                // empty css
                item.ranges = [];
            }
        }

    }

    return mergedList;
};

// ============================================================

const mergeSingleSubGroups = (item) => {

    if (!item.subs) {
        return;
    }
    if (item.subs.length === 1) {
        const sub = item.subs[0];
        if (!sub.subs) {
            return;
        }
        item.name = [item.name, sub.name].filter((it) => it).join('/');
        item.subs = sub.subs;
        mergeSingleSubGroups(item);
        return;
    }

    item.subs.forEach((sub) => {
        mergeSingleSubGroups(sub);
    });

};

const getRowData = (rowName, summary, metrics) => {
    const summaryRow = {};
    let lowest = {
        pct: 100,
        status: 'high'
    };
    metrics.map((k) => {
        const s = summary[k];
        const percent = s.pct;
        if (typeof percent !== 'number') {
            return;
        }
        summaryRow[k] = Util.getColorStrByStatus(Util.PSF(percent, 100, 2), s.status);
        if (percent < lowest.pct) {
            lowest = s;
        }
    });
    summaryRow.name = Util.getColorStrByStatus(rowName, lowest.status);
    return summaryRow;
};

const getUncoveredLines = (file) => {
    const lines = [];

    const dataLines = file.data.lines;

    let startLine;
    let endLine;

    const addLines = () => {
        if (!startLine) {
            return;
        }
        if (endLine) {
            // range
            const link = startLine.color === 'yellow' && endLine.color === 'yellow' ? EC.yellow('-') : EC.red('-');
            lines.push(EC[startLine.color](startLine.line) + link + EC[endLine.color](endLine.line));
            startLine = null;
            endLine = null;
        } else {
            // only start
            lines.push(EC[startLine.color](startLine.line));
            startLine = null;
        }
    };

    const setLines = (line, color) => {
        if (startLine) {
            endLine = {
                line,
                color
            };
            return;
        }
        startLine = {
            line,
            color
        };
    };

    Object.keys(dataLines).forEach((line) => {
        const count = dataLines[line];
        if (count === 0) {
            setLines(line, 'red');
            return;
        }
        // 0 < count < 1
        if (typeof count === 'string') {
            setLines(line, 'yellow');
            return;
        }
        // count >= 1
        addLines();
    });
    addLines();

    return lines.join(',');
};

const getGroupedRows = (files, metrics, cdOptions) => {

    const skipPercent = cdOptions.skipPercent;
    if (typeof skipPercent === 'number' && skipPercent > 0) {
        files = files.filter((file) => {
            const { summary } = file;
            for (const k of metrics) {
                const percent = summary[k].pct;
                if (typeof percent === 'number' && percent < skipPercent) {
                    return true;
                }
            }
            return false;
        });
    }

    let groups = [];

    files.forEach((file) => {
        const { sourcePath, summary } = file;
        const pathList = sourcePath.split('/');
        const lastName = pathList.pop();
        let subs = groups;
        pathList.forEach((key) => {
            const item = subs.find((it) => it.name === key && it.subs);
            if (item) {
                subs = item.subs;
                return;
            }
            const sub = {
                name: key,
                subs: []
            };
            subs.push(sub);
            subs = sub.subs;
        });
        const fileRow = getRowData(lastName, summary, metrics);
        fileRow.uncoveredLines = getUncoveredLines(file);
        subs.push(fileRow);
    });

    const group = {
        subs: groups
    };
    mergeSingleSubGroups(group);

    if (group.name) {
        groups = [group];
    }

    return groups;
};

const handleConsoleDetailsReport = (reportData, reportOptions, options) => {
    const cdOptions = {
        maxCols: 50,
        skipPercent: 0,
        metrics: [],
        ... reportOptions
    };

    const {
        name, summary, files
    } = reportData;

    if (name) {
        EC.logCyan(name);
    }

    const metrics = Util.getMetrics('v8', cdOptions.metrics);
    const rows = getGroupedRows(files, metrics, cdOptions);
    const summaryRow = getRowData('Summary', summary, metrics);
    // no rows if skipped all by skipPercent
    if (rows.length) {
        rows.push({
            innerBorder: true
        });
    }
    rows.push(summaryRow);

    const columns = [{
        id: 'name',
        name: 'Name'
    }, ... metrics.map((m) => {
        return {
            id: m,
            name: Util.capitalizeFirstLetter(m),
            align: 'right'
        };
    }), {
        id: 'uncoveredLines',
        name: 'Uncovered Lines'
    }];

    CG({
        options: {
            nullPlaceholder: '',
            defaultMaxWidth: cdOptions.maxCols
        },
        columns,
        rows
    });
};

const handleCodecovReport = async (reportData, reportOptions, options) => {
    const codecovOptions = {
        outputFile: 'codecov.json',
        ... reportOptions
    };

    const jsonPath = path.resolve(options.outputDir, codecovOptions.outputFile);

    // https://docs.codecov.com/docs/codecov-custom-coverage-format
    const coverage = {};
    reportData.files.forEach((item) => {
        const { sourcePath, data } = item;
        coverage[sourcePath] = data.lines;
    });
    const codecovData = {
        coverage
    };

    await Util.writeFile(jsonPath, JSON.stringify(codecovData));
    return Util.relativePath(jsonPath);
};

const handleV8JsonReport = async (reportData, reportOptions, options) => {
    const v8JsonOptions = {
        outputFile: 'coverage-report.json',
        ... reportOptions
    };

    // console.log(mergedOptions);
    const jsonPath = path.resolve(options.outputDir, v8JsonOptions.outputFile);
    await Util.writeFile(jsonPath, JSON.stringify(reportData));
    return Util.relativePath(jsonPath);
};


const handleV8HtmlReport = async (reportData, reportOptions, options) => {

    // V8 only options, merged with root options
    const v8HtmlOptions = {
        outputFile: options.outputFile,
        inline: options.inline,
        assetsPath: options.assetsPath,
        metrics: options.metrics,
        ... reportOptions
    };

    // add metrics to data for UI
    reportData.metrics = v8HtmlOptions.metrics;

    const {
        outputFile, inline, assetsPath
    } = v8HtmlOptions;

    // resolve full report path
    const reportPath = path.resolve(options.outputDir, outputFile);
    const outputDir = path.dirname(reportPath);
    const htmlFile = path.basename(reportPath);

    // deps
    const jsFiles = ['monocart-code-viewer', 'monocart-formatter', 'turbogrid'].map((it) => {
        return Util.resolveNodeModule(`${it}/dist/${it}.js`);
    });

    // package v8 ui
    jsFiles.push(Util.resolvePackage('monocart-coverage-v8.js'));

    // console.log(jsFiles);

    const htmlOptions = {
        reportData,
        jsFiles,
        inline,
        assetsPath,
        outputDir,
        htmlFile,

        reportDataFile: 'coverage-data.js'
    };

    const htmlPath = await Util.saveHtmlReport(htmlOptions);

    return htmlPath;
};

const saveV8Report = async (v8list, options) => {

    const defaultWatermarks = {
        bytes: [50, 80],
        statements: [50, 80],
        branches: [50, 80],
        functions: [50, 80],
        lines: [50, 80]
    };
    const watermarks = Util.resolveWatermarks(defaultWatermarks, options.watermarks);

    const summary = getV8Summary(v8list, watermarks);

    const reportData = {
        name: options.name,
        version,
        watermarks,
        summary,
        files: v8list
    };

    // v8 reports
    const buildInV8Reports = {
        'v8': handleV8HtmlReport,
        'v8-json': handleV8JsonReport,
        'codecov': handleCodecovReport,
        'console-details': handleConsoleDetailsReport
    };

    const outputs = {};
    const v8Group = options.reportGroup.v8;
    const v8Reports = Object.keys(v8Group);
    for (const reportName of v8Reports) {
        const reportOptions = v8Group[reportName];
        const buildInHandler = buildInV8Reports[reportName];
        if (buildInHandler) {
            outputs[reportName] = await buildInHandler(reportData, reportOptions, options);
        } else {
            outputs[reportName] = await Util.runCustomReporter(reportName, reportData, reportOptions, options);
        }
    }

    // outputPath, should be html or json
    const reportPath = Util.resolveReportPath(options, () => {
        return outputs.v8 || outputs['v8-json'] || Object.values(outputs).filter((it) => it && typeof it === 'string').shift();
    });

    const coverageResults = {
        type: 'v8',
        reportPath,
        name: options.name,
        watermarks,
        summary,
        files: v8list
    };

    return coverageResults;
};

module.exports = {
    initV8ListAndSourcemap,
    mergeV8Coverage,
    saveV8Report
};
