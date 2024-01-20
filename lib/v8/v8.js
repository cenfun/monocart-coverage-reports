const path = require('path');
const Util = require('../utils/util.js');
const { getV8Summary } = require('./v8-summary.js');
const { dedupeRanges } = require('../utils/dedupe.js');
const { getSourcePath } = require('../utils/source-path.js');
const { mergeScriptCovs } = require('../packages/monocart-coverage-vendor.js');
const collectSourceMaps = require('../converter/collect-source-maps.js');
const version = require('../../package.json').version;

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

        const type = item.type;

        const data = {
            url: item.url,
            type
        };

        if (type === 'js') {
            data.functions = item.functions;
            data.source = item.source;
            // could be existed
            data.sourceMap = item.sourceMap;
        } else {
            // css
            data.ranges = item.ranges;
            data.source = item.text;
        }


        // no functions and ranges
        if (item.empty) {
            data.empty = true;
        }

        const idList = [];
        // could be existed
        const distFile = item.distFile;
        if (distFile) {
            data.distFile = distFile;
            idList.push(distFile);
        }

        let sourcePath = getSourcePath(data.url, i + 1, data.type);
        if (typeof sourcePathHandler === 'function') {
            const newSourcePath = sourcePathHandler(sourcePath, data.url);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }

        data.sourcePath = sourcePath;

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

const saveCodecovReport = async (reportData, options, codecovOptions) => {
    const mergedOptions = {
        outputFile: 'codecov.json',
        ... codecovOptions
    };

    // console.log(mergedOptions);
    const jsonPath = path.resolve(options.outputDir, mergedOptions.outputFile);

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

const saveV8JsonReport = async (reportData, options, v8JsonOptions) => {
    const mergedOptions = {
        outputFile: 'coverage-report.json',
        ... v8JsonOptions
    };

    // console.log(mergedOptions);
    const jsonPath = path.resolve(options.outputDir, mergedOptions.outputFile);
    await Util.writeFile(jsonPath, JSON.stringify(reportData));
    return Util.relativePath(jsonPath);
};


const saveV8HtmlReport = async (reportData, options, v8HtmlOptions) => {

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

    let outputPath;

    // v8 reports
    const v8Group = options.reportGroup.v8;

    // v8 html
    const v8Options = v8Group.v8;
    if (v8Options) {

        // V8 only options, merged with root options
        const v8HtmlOptions = {
            outputFile: options.outputFile,
            inline: options.inline,
            assetsPath: options.assetsPath,
            metrics: options.metrics,
            ... v8Options
        };

        // add metrics to data
        reportData.metrics = v8HtmlOptions.metrics;

        outputPath = await saveV8HtmlReport(reportData, options, v8HtmlOptions);
    }

    // v8 json (after html for metrics data)
    const v8JsonOptions = v8Group['v8-json'];
    if (v8JsonOptions) {
        const jsonPath = await saveV8JsonReport(reportData, options, v8JsonOptions);
        if (!outputPath) {
            outputPath = jsonPath;
        }
    }

    // codecov
    const codecovOptions = v8Group.codecov;
    if (codecovOptions) {
        const jsonPath = await saveCodecovReport(reportData, options, codecovOptions);
        if (!outputPath) {
            outputPath = jsonPath;
        }
    }

    // outputPath last one is html
    const reportPath = Util.resolveReportPath(options, () => {
        return outputPath;
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
