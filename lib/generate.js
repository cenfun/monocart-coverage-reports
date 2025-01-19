const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const Util = require('./utils/util.js');
const { convertV8List } = require('./converter/converter.js');
const { resolveSourceMap } = require('./converter/collect-source-maps.js');
const { StreamZip } = require('./packages/monocart-coverage-vendor.js');

// ========================================================================================================
// built-in reports

// istanbul
const { mergeIstanbulCoverage, saveIstanbulReports } = require('./istanbul/istanbul.js');

// v8
const { mergeV8Coverage, saveV8Report } = require('./v8/v8.js');

// both
const { codecovReport } = require('./reports/codecov.js');
const { codacyReport } = require('./reports/codacy.js');

const { consoleDetailsReport } = require('./reports/console-details.js');
const { consoleSummaryReport } = require('./reports/console-summary.js');

const { markdownDetailsReport } = require('./reports/markdown-details.js');
const { markdownSummaryReport } = require('./reports/markdown-summary.js');

const { rawReport } = require('./reports/raw.js');

const { customReport } = require('./reports/custom.js');

const allBuiltInReports = {
    // v8
    'v8': 'v8',
    'v8-json': 'v8',

    // istanbul
    'clover': 'istanbul',
    'cobertura': 'istanbul',
    'html': 'istanbul',
    'html-spa': 'istanbul',
    'json': 'istanbul',
    'json-summary': 'istanbul',
    'lcov': 'istanbul',
    'lcovonly': 'istanbul',
    'none': 'istanbul',
    'teamcity': 'istanbul',
    'text': 'istanbul',
    'text-lcov': 'istanbul',
    'text-summary': 'istanbul',

    // both
    'codecov': 'both',
    'codacy': 'both',
    'console-details': 'both',
    'console-summary': 'both',
    'markdown-details': 'both',
    'markdown-summary': 'both',
    'raw': 'both'
};

const bothBuiltInReports = {
    'codecov': codecovReport,
    'codacy': codacyReport,

    'console-details': consoleDetailsReport,
    'console-summary': consoleSummaryReport,

    'markdown-details': markdownDetailsReport,
    'markdown-summary': markdownSummaryReport,

    'raw': rawReport
};

// ========================================================================================================

const getReportGroup = (reports, lcov, dataType) => {

    const reportMap = {};

    const reportList = Util.toList(reports, ',');
    reportList.forEach((it) => {
        if (Util.isList(it)) {
            // ["v8"], ["v8", {}]
            const id = it[0];
            if (typeof id === 'string' && id) {
                reportMap[id] = {
                    ... it[1]
                };
            }
            return;
        }
        if (typeof it === 'string' && it) {
            reportMap[it] = {};
        }
    });

    // using default report if no reports
    if (!Object.keys(reportMap).length) {
        const defaultReport = dataType === 'v8' ? 'v8' : 'html';
        reportMap[defaultReport] = {};
    }

    // add lcovonly report after default report
    if (lcov && !reportMap.lcovonly) {
        reportMap.lcovonly = {};
    }

    // group v8 and istanbul
    const groupMap = new Map();
    Object.keys(reportMap).forEach((k) => {
        const options = reportMap[k];

        let type = allBuiltInReports[k];
        if (!type) {
            // for custom reporter
            type = options.type || 'v8';
        }

        let group = groupMap.get(type);
        if (!group) {
            group = new Map();
            groupMap.set(type, group);
        }

        group.set(k, options);

    });

    // requires a default istanbul report if data is istanbul
    if (dataType === 'istanbul' && !groupMap.has('istanbul')) {
        const istanbulGroup = new Map();
        istanbulGroup.set('html', {});
        groupMap.set('istanbul', istanbulGroup);
    }

    return groupMap;
};

// ========================================================================================================

// maybe v8 or to istanbul reports
const generateV8ListReports = async (v8list, coverageData, fileSources, options) => {
    let istanbulReportPath;
    // v8 to istanbul reports
    if (options.reportGroup.has('istanbul')) {
        const istanbulCoverageResults = await saveIstanbulReports(coverageData, fileSources, options);
        istanbulReportPath = istanbulCoverageResults.reportPath;
    }

    // v8 reports and v8 coverage results
    // could be no v8 or v8-json, but requires v8 coverage results
    const v8CoverageResults = await saveV8Report(v8list, options, istanbulReportPath);
    return v8CoverageResults;
};

const getCoverageResults = async (dataList, sourceCache, options) => {
    // get first and check v8list or istanbul data
    const firstData = dataList[0];
    const dataType = firstData.type;
    // console.log('data type', dataType);

    // init reports
    options.reportGroup = getReportGroup(options.reports, options.lcov, dataType);
    // console.log('reportGroup', options.reportGroup);

    // v8list
    if (dataType === 'v8') {
        // merge v8list first
        const t1 = Date.now();
        const v8list = await mergeV8Coverage(dataList, sourceCache, options);
        Util.logTime(`${EC.magenta('├')} [generate] merged v8 coverage data`, t1);
        // console.log('after merge', v8list.map((it) => it.url));

        const t2 = Date.now();
        const results = await convertV8List(v8list, options);
        Util.logTime(`${EC.magenta('├')} [generate] converted coverage data`, t2);

        const {
            v8DataList, coverageData, fileSources
        } = results;
        return generateV8ListReports(v8DataList, coverageData, fileSources, options);
    }

    // istanbul data
    const t3 = Date.now();
    const istanbulData = await mergeIstanbulCoverage(dataList, options);
    Util.logTime(`${EC.magenta('├')} [generate] prepared istanbul coverage data`, t3);
    const fileSources = options.fileSources || {};
    const results = await saveIstanbulReports(istanbulData, fileSources, options);
    return results;
};

const generateCoverageReports = async (dataList, sourceCache, options) => {
    const coverageResults = await getCoverageResults(dataList, sourceCache, options);

    // [ 'type', 'reportPath', 'name', 'watermarks', 'summary', 'files' ]
    // console.log(Object.keys(coverageResults));

    if (options.reportGroup.has('both')) {
        const bothGroup = options.reportGroup.get('both');
        for (const [reportName, reportOptions] of bothGroup) {
            const builtInHandler = bothBuiltInReports[reportName];
            const t1 = Date.now();
            if (builtInHandler) {
                await builtInHandler(coverageResults, reportOptions, options);
            } else {
                await customReport(reportName, coverageResults, reportOptions, options);
            }
            Util.logTime(`${EC.magenta('├')} [generate] saved report: ${reportName}`, t1);
        }
    }

    return coverageResults;
};


// ========================================================================================================

const getInputList = (mcr) => {
    // get input dirs
    const { inputDir, cacheDir } = mcr.options;

    const inputDirs = Util.toList(inputDir, ',');

    const inputList = inputDirs.filter((dir) => {
        const hasDir = fs.existsSync(dir);
        if (!hasDir) {
            // could be empty
            Util.logInfo(`Input coverage not exists: ${Util.relativePath(dir)}`);
        }
        return hasDir;
    });

    if (mcr.hasCache()) {
        inputList.push(cacheDir);
    }

    return inputList;
};

const addJsonData = async (mcr, dataList, sourceCache, input, filename) => {
    const isCoverage = filename.startsWith('coverage-');
    const isSource = filename.startsWith('source-');
    if (isCoverage || isSource) {
        let json = input;
        if (typeof input === 'string') {
            if (mcr.fileCache.has(filename)) {
                json = mcr.fileCache.get(filename);
            } else {
                json = await Util.readJson(path.resolve(input, filename));
            }
        }
        if (json) {
            if (isCoverage) {
                dataList.push(json);
            } else {
                sourceCache.set(json.id, json);
            }
        }
    }
};

const addDirData = async (mcr, dataList, sourceCache, dir) => {
    const allFiles = fs.readdirSync(dir);
    if (!allFiles.length) {
        return;
    }
    for (const filename of allFiles) {
        // only json file
        if (filename.endsWith('.json')) {
            await addJsonData(mcr, dataList, sourceCache, dir, filename);
        }
    }
};

const addZipData = async (mcr, dataList, sourceCache, dir) => {
    const zip = new StreamZip({
        file: dir
    });
    const entries = await zip.entries();
    for (const entry of Object.values(entries)) {
        if (entry.isDirectory) {
            continue;
        }
        const entryName = entry.name;
        const filename = path.basename(entryName);
        // console.log('============================', filename);
        if (filename.endsWith('.json')) {
            const buf = await zip.entryData(entryName);
            const json = JSON.parse(buf.toString('utf-8'));
            await addJsonData(mcr, dataList, sourceCache, json, filename);
        }

    }
    // Do not forget to close the file once you're done
    await zip.close();
};

const getInputData = async (mcr) => {

    const inputList = getInputList(mcr);
    // console.log('input list', inputList);

    const dataList = [];
    const sourceCache = new Map();

    for (const dir of inputList) {

        const info = fs.statSync(dir);
        if (info.isDirectory()) {
            await addDirData(mcr, dataList, sourceCache, dir);
        } else if (info.isFile()) {
            await addZipData(mcr, dataList, sourceCache, dir);
        } else {
            Util.logError(`Invalid input: ${dir}`);
        }

    }

    if (!dataList.length) {
        const dirs = inputList.map((dir) => Util.relativePath(dir));
        Util.logError(`Not found coverage data in dir(s): ${dirs.join(', ')}`);
        return;
    }

    return {
        dataList,
        sourceCache
    };
};

// ========================================================================================================

const resolveEntrySource = (entry, sourceMapCache, sourceCache) => {

    const url = entry.url;

    // source from `source-id.json`
    const sourceData = sourceCache.get(url);
    if (sourceData) {
        entry.source = sourceData.source;
        return;
    }

    // source for typescript file from source map cache
    // Note: no runtime code but lineLengths
    const tsExtensionsPattern = /\.([cm]?ts|[tj]sx)($|\?)/;
    if (tsExtensionsPattern.test(url)) {
        const sourcemapData = sourceMapCache[url];
        const lineLengths = sourcemapData && sourcemapData.lineLengths;

        // for fake source file (can not parse to AST)
        if (lineLengths) {
            let fakeSource = '';
            sourcemapData.lineLengths.forEach((length) => {
                fakeSource += `${''.padEnd(length, '*')}\n`;
            });
            entry.fake = true;
            entry.source = fakeSource;
            return;
        }

    }

    // Note: it could be jsx format even extname is `.js`
    const filePath = fileURLToPath(url);
    if (fs.existsSync(filePath)) {
        entry.source = fs.readFileSync(filePath).toString('utf8');
    }

};

const resolveEntrySourceMap = (entry, sourceMapCache) => {
    // sourcemap data
    const sourcemapData = sourceMapCache[entry.url];
    if (sourcemapData) {
        if (sourcemapData.data) {
            entry.sourceMap = resolveSourceMap(sourcemapData.data, entry.url);
        }
    }
};

const readCoverageData = async (dir, filename, entryFilter, sourceCache) => {

    const content = await Util.readFile(path.resolve(dir, filename));
    if (!content) {
        return;
    }
    const json = JSON.parse(content);
    if (!json) {
        return;
    }

    // raw v8 json
    let coverageData = json.result;
    if (!Util.isList(coverageData)) {
        return;
    }

    // filter node internal files, should no anonymous for nodejs
    coverageData = coverageData.filter((entry) => entry.url && entry.url.startsWith('file:'));

    const lengthBefore = coverageData.length;
    coverageData = coverageData.filter(entryFilter);
    const lengthAfter = coverageData.length;
    Util.logFilter('entry filter (addFromDir):', lengthBefore, lengthAfter);

    if (!Util.isList(coverageData)) {
        // Util.logDebug('No coverage data after filter');
        return;
    }

    const sourceMapCache = json['source-map-cache'] || {};
    for (const entry of coverageData) {
        resolveEntrySource(entry, sourceMapCache, sourceCache);
        resolveEntrySourceMap(entry, sourceMapCache);
    }

    return coverageData;
};

const readSourceList = async (dir, sourceList) => {
    const sourceCache = new Map();

    for (const filename of sourceList) {
        const content = await Util.readFile(path.resolve(dir, filename));
        if (!content) {
            continue;
        }
        const json = JSON.parse(content);
        if (!json) {
            continue;
        }
        if (json.url) {
            sourceCache.set(json.url, json);
        }
    }

    return sourceCache;
};

const readFromDir = async (mcr, dir) => {

    if (!dir || !fs.existsSync(dir)) {
        Util.logInfo(`Not found V8 coverage dir: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    const coverageList = [];
    const sourceList = [];

    files.forEach((filename) => {
        // read all json files
        if (filename.endsWith('.json')) {
            // could be source files generated by register hooks
            if (filename.startsWith('source-')) {
                sourceList.push(filename);
            } else {
                coverageList.push(filename);
            }
        }
    });

    if (!coverageList.length) {
        Util.logInfo(`No coverage files in the dir: ${dir}`);
        return;
    }

    const sourceCache = await readSourceList(dir, sourceList);

    const entryFilter = mcr.getEntryFilter();

    for (const filename of coverageList) {
        const coverageData = await readCoverageData(dir, filename, entryFilter, sourceCache);
        if (coverageData) {
            await mcr.add(coverageData);
        }
    }

    // GC
    sourceCache.clear();

};

module.exports = {
    getInputData,
    readFromDir,
    generateCoverageReports
};
