const path = require('path');
const Util = require('../utils/util.js');
const { getV8Summary } = require('./v8-summary.js');
const { dedupeRanges } = require('../utils/dedupe.js');
const { getSourcePath } = require('../utils/source-path.js');
const { mergeScriptCovs } = require('../packages/monocart-coverage-vendor.js');
const collectSourceMaps = require('../converter/collect-source-maps.js');
const version = require('../../package.json').version;

const getWrapperSource = (offset, source) => {
    // no \n because there are line in mappings
    let startStr = '';
    if (offset > 4) {
        // comments not need indent
        const spaces = ''.padEnd(offset - 4, '*');
        startStr = `/*${spaces}*/`;
    } else {
        // just spaces
        startStr += ''.padEnd(offset, ' ');
    }
    return startStr + source;
};

const initV8ListAndSourcemap = async (v8list, options) => {

    // filter list first
    const entryFilter = options.entryFilter;
    if (typeof entryFilter === 'function') {
        v8list = v8list.filter(entryFilter);
    }

    // filter no source or text
    // init type and css source from text
    // keep functions
    v8list = v8list.filter((item) => {
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

    const sourcePathHandler = options.sourcePath;

    // init id, sourcePath
    v8list = v8list.map((item, i) => {

        let source = item.source || item.text;

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
            // empty coverage
            empty: item.empty,
            // using for match source id when using empty coverage
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
        if (typeof sourcePathHandler === 'function') {
            const newSourcePath = sourcePathHandler(sourcePath, data.url);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }
        data.sourcePath = sourcePath;

        // calculate source id
        const idList = [];
        if (data.distFile) {
            idList.push(data.distFile);
        }
        idList.push(sourcePath);
        idList.push(data.source);
        data.id = Util.calculateSha1(idList.join(''));

        return data;
    });

    // collect sourcemap first
    const time_start = Date.now();
    const count = await collectSourceMaps(v8list, options);
    if (count) {
        // debug level time
        Util.logTime(`loaded ${count} sourcemaps`, time_start);
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
        const ranges = dedupeRanges(concatRanges);

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

const mergeV8Coverage = async (dataList, options) => {

    let allList = [];
    dataList.forEach((d) => {
        allList = allList.concat(d.data);
    });

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
    const emptyList = allList.filter((it) => it.empty).filter((it) => !itemMap[it.id]);

    // empty list + merged list
    const mergedList = emptyList.concat(Object.values(itemMap));

    // try to load coverage and source by id
    for (const item of mergedList) {
        const {
            id, type, empty
        } = item;
        const sourcePath = Util.resolveCacheSourcePath(options.cacheDir, id);
        const content = await Util.readFile(sourcePath);
        if (content) {
            const json = JSON.parse(content);
            item.source = json.source;
            item.sourceMap = json.sourceMap;
        } else {
            Util.logError(`failed to read source: ${item.url}`);
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

const saveCodecovReport = async (reportData, reportOptions, options) => {
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

const saveV8JsonReport = async (reportData, reportOptions, options) => {
    const v8JsonOptions = {
        outputFile: 'coverage-report.json',
        ... reportOptions
    };

    // console.log(mergedOptions);
    const jsonPath = path.resolve(options.outputDir, v8JsonOptions.outputFile);
    await Util.writeFile(jsonPath, JSON.stringify(reportData));
    return Util.relativePath(jsonPath);
};


const saveV8HtmlReport = async (reportData, reportOptions, options) => {

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
        functions: [50, 80],
        branches: [50, 80],
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
        'v8': saveV8HtmlReport,
        'v8-json': saveV8JsonReport,
        'codecov': saveCodecovReport
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
