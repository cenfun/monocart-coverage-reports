const path = require('path');
const Util = require('../utils/util.js');
const { getV8Summary } = require('./v8-summary.js');
const { dedupeRanges } = require('../converter/dedupe.js');
const { getSourcePath } = require('../converter/source-path.js');
const { mergeScriptCovs } = require('../packages/monocart-coverage-vendor.js');
const collectSourceMaps = require('../converter/collect-source-maps.js');

const initV8ListAndSourcemap = async (v8list, options, inlineSourceMap) => {

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
            return true;
        }
        if (typeof item.text === 'string' && item.ranges) {
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

        const data = {
            url: item.url
        };

        if (item.functions) {
            data.type = 'js';
            data.functions = item.functions;
            data.source = item.source;
            // useless here
            // data.scriptId = item.scriptId;
        } else if (item.ranges) {
            data.type = 'css';
            data.ranges = item.ranges;
            data.source = item.text;
        }

        data.id = Util.calculateSha1(data.url + data.source);

        let sourcePath = getSourcePath(data.url, i + 1, data.type);
        if (typeof sourcePathHandler === 'function') {
            const newSourcePath = sourcePathHandler(sourcePath, data.url);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }

        data.sourcePath = sourcePath;

        return data;
    });

    // collect sourcemap first
    const time_start = Date.now();
    const count = await collectSourceMaps(v8list, options, inlineSourceMap);
    if (count) {
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

    let list = [];
    dataList.forEach((d) => {
        list = list.concat(d.data);
    });

    // console.log('before merge', list.map((it) => it.url));

    // connect all functions and ranges
    const itemMap = {};
    const mergeMap = {};
    list.forEach((item) => {
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

    list = Object.values(itemMap);

    // try to load coverage and source by id
    for (const item of list) {
        const { id } = item;
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
    }

    return list;
};

// ============================================================

const saveV8JsonReport = async (reportData, options, v8JsonOptions) => {
    const v8MergedOptions = {
        outputFile: 'coverage-report.json',
        ... v8JsonOptions
    };

    // console.log(v8MergedOptions);
    const jsonPath = path.resolve(options.outputDir, v8MergedOptions.outputFile);
    // console.log(reportPath);
    await Util.writeFile(jsonPath, JSON.stringify(reportData));

    return Util.relativePath(jsonPath);
};


const saveV8HtmlReport = async (reportData, options, v8HtmlOptions) => {

    // V8 only options, merged with root options
    const v8MergedOptions = {
        outputFile: options.outputFile,
        inline: options.inline,
        assetsPath: options.assetsPath,
        ... v8HtmlOptions
    };

    const {
        outputFile, inline, assetsPath
    } = v8MergedOptions;

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
        bytes: [50, 80]
    };
    const watermarks = Util.resolveWatermarks(defaultWatermarks, options.watermarks);

    const bytesWatermarks = watermarks.bytes;

    // init summary
    v8list.forEach((entry) => {
        entry.summary = getV8Summary(entry);
    });

    // calculate pct, status and summary
    const summaryList = v8list.map((entry) => entry.summary);
    let total = 0;
    let covered = 0;
    summaryList.forEach((item) => {

        total += item.total;
        covered += item.covered;

        item.pct = Util.PNF(item.covered, item.total, 2);
        item.status = Util.getStatus(item.pct, bytesWatermarks);

    });

    const uncovered = total - covered;

    const pct = Util.PNF(covered, total, 2);
    const status = Util.getStatus(pct, bytesWatermarks);

    const summary = {
        total,
        covered,
        uncovered,
        pct,
        status
    };

    const reportData = {
        name: options.name,
        watermarks,
        summary,
        files: v8list
    };

    let outputPath;

    // v8 reports
    const v8Map = options.reportGroup.v8;

    // v8 json
    const v8JsonOptions = v8Map['v8-json'];
    if (v8JsonOptions) {
        outputPath = await saveV8JsonReport(reportData, options, v8JsonOptions);
    }

    // v8 html
    const v8HtmlOptions = v8Map.v8;
    if (v8HtmlOptions) {
        outputPath = await saveV8HtmlReport(reportData, options, v8HtmlOptions);
    }

    const reportPath = Util.resolveReportPath(options, () => {
        return outputPath;
    });

    const report = {
        type: 'v8',
        reportPath,
        name: options.name,
        watermarks,
        summary,
        files: summaryList
    };

    return report;
};

module.exports = {
    initV8ListAndSourcemap,
    mergeV8Coverage,
    saveV8Report
};
