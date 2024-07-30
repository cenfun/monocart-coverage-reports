const fs = require('fs');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');

const EC = require('eight-colors');
const { minimatch } = require('./packages/monocart-coverage-vendor.js');

const Util = require('./utils/util.js');
const { convertV8List } = require('./converter/converter.js');
const { resolveSourceMap } = require('./converter/collect-source-maps.js');

// ========================================================================================================
// built-in reports

// istanbul
const {
    initIstanbulData, mergeIstanbulCoverage, saveIstanbulReports
} = require('./istanbul/istanbul.js');

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
        Util.logTime('┌ [generate] merged v8 coverage data', t1);
        // console.log('after merge', v8list.map((it) => it.url));

        const t2 = Date.now();
        const results = convertV8List(v8list, options);
        Util.logTime('┌ [generate] converted coverage data', t2);

        const {
            v8DataList, coverageData, fileSources
        } = results;
        return generateV8ListReports(v8DataList, coverageData, fileSources, options);
    }

    // istanbul data
    const t3 = Date.now();
    const istanbulData = mergeIstanbulCoverage(dataList);
    const { coverageData, fileSources } = initIstanbulData(istanbulData, options);
    Util.logTime('┌ [generate] prepared istanbul coverage data', t3);
    const results = await saveIstanbulReports(coverageData, fileSources, options);
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
            Util.logTime(`┌ [generate] saved report: ${reportName}`, t1);
        }
    }

    return coverageResults;
};

// ========================================================================================================

const resolveAllDirList = (input) => {
    const dirs = Util.toList(input, ',');
    if (!dirs.length) {
        return;
    }
    const dirList = dirs.filter((it) => fs.existsSync(it));
    if (!dirList.length) {
        return;
    }
    return dirList;
};

const resolveAllFilter = (input) => {
    // for function handler
    if (typeof input === 'function') {
        return input;
    }

    // for single minimatch pattern
    if (input && typeof input === 'string') {
        // string to multiple patterns "{...}"
        const obj = Util.strToObj(input);
        if (obj) {
            input = obj;
        } else {
            return (filePath) => {
                return minimatch(filePath, input);
            };
        }
    }

    // for patterns
    if (input && typeof input === 'object') {
        const patterns = Object.keys(input);
        return (filePath) => {
            for (const pattern of patterns) {
                if (minimatch(filePath, pattern)) {
                    return input[pattern];
                }
            }
            // false if not matched
        };
    }

    // default
    return () => true;
};

const resolveAllDataType = (type, dataList) => {
    if (!type && dataList.length) {
        const firstData = dataList[0];
        type = firstData.type;
    }
    const types = {
        v8: 'v8',
        istanbul: 'istanbul'
    };
    return types[type] || types.v8;
};

const resolveAllOptions = (input, dataList) => {
    if (!input) {
        return;
    }

    let type;
    let dir;
    let filter;

    if (typeof input === 'string') {
        const obj = Util.strToObj(input);
        if (obj) {
            type = obj.type;
            dir = obj.dir;
            filter = obj.filter;
        } else {
            dir = input;
        }
    } else if (Array.isArray(input)) {
        dir = input;
    } else {
        type = input.type;
        dir = input.dir;
        filter = input.filter;
    }

    const dirList = resolveAllDirList(dir);
    if (!dirList) {
        return;
    }

    const dataType = resolveAllDataType(type, dataList);
    const fileFilter = resolveAllFilter(filter);

    return {
        dirList,
        dataType,
        fileFilter
    };
};

const resolveFileType = (fileType, filePath) => {
    if (fileType === 'js' || fileType === 'css') {
        return fileType;
    }
    const extname = path.extname(filePath);
    if (['.css', '.scss', '.sass', '.less'].includes(extname)) {
        return 'css';
    }
    return 'js';
};

const getV8EmptyData = (fileList) => {
    const v8DataList = [];
    fileList.forEach((item) => {
        const { filePath, fileType } = item;
        const type = resolveFileType(fileType, filePath);
        const url = pathToFileURL(filePath).toString();
        const source = Util.readFileSync(filePath);
        const entryFile = {
            empty: true,
            type,
            url,
            // for empty, css supports both source and text
            source
        };
        v8DataList.push(entryFile);
    });
    return v8DataList;
};

const getIstanbulEmptyData = (fileList) => {
    const istanbulData = {};
    fileList.forEach((item) => {
        const { filePath } = item;
        istanbulData[filePath] = {
            path: filePath,
            statementMap: {},
            fnMap: {},
            branchMap: {},
            s: {},
            f: {},
            b: {}
        };
    });
    return istanbulData;
};

const getEmptyData = (all, dataList) => {
    const allOptions = resolveAllOptions(all, dataList);
    // console.log('allOptions', all, allOptions);
    if (!allOptions) {
        return;
    }
    const {
        dirList, dataType, fileFilter
    } = allOptions;
    const fileList = [];
    dirList.forEach((dir) => {
        Util.forEachFile(dir, [], (fileName, fileDir) => {
            const filePath = path.resolve(fileDir, fileName);
            const fileType = fileFilter(filePath);
            if (fileType) {
                fileList.push({
                    filePath,
                    fileType
                });
            }
        });
    });
    // console.log('fileList', fileList);
    if (!fileList.length) {
        return;
    }
    if (dataType === 'v8') {
        return getV8EmptyData(fileList);
    }
    return getIstanbulEmptyData(fileList);
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
            Util.logInfo(`Not found coverage data dir: ${Util.relativePath(dir)}`);
        }
        return hasDir;
    });

    if (mcr.hasCache()) {
        inputList.push(cacheDir);
    }

    return inputList;
};

const addJsonData = async (mcr, dataList, sourceCache, dir, filename) => {
    const isCoverage = filename.startsWith('coverage-');
    const isSource = filename.startsWith('source-');
    if (isCoverage || isSource) {
        let json;
        if (mcr.fileCache.has(filename)) {
            json = mcr.fileCache.get(filename);
        } else {
            const content = await Util.readFile(path.resolve(dir, filename));
            if (content) {
                json = JSON.parse(content);
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

const addEmptyData = async (mcr, dataList, sourceCache) => {

    const { all, cacheDir } = mcr.options;
    // add empty coverage for all files
    // dataList for data type, before `add` we don't which one is tested, because using hash id
    const emptyData = getEmptyData(all, dataList);
    if (!emptyData) {
        return;
    }

    let files = 0;
    if (Util.isList(emptyData)) {
        files = emptyData.length;
    } else {
        files = Object.keys(emptyData).length;
    }

    Util.logDebug(`added all files with empty coverage: ${EC.yellow(files)}`);
    const coverageResults = await mcr.add(emptyData);
    // after `add`
    if (!coverageResults) {
        return;
    }

    dataList.push(coverageResults);

    if (coverageResults.type === 'v8') {
        // sourceCache
        coverageResults.data.forEach((entry) => {
            const { id } = entry;
            if (sourceCache.has(id)) {
                // console.log('+', entry.sourcePath);
                return;
            }
            // console.log('-', entry.sourcePath);
            const { cacheName, cachePath } = Util.getCacheFileInfo('source', id, cacheDir);
            if (mcr.fileCache.has(cacheName)) {
                const json = mcr.fileCache.get(cacheName);
                sourceCache.set(json.id, json);
            } else {
                const content = Util.readFileSync(cachePath);
                if (content) {
                    const json = JSON.parse(content);
                    sourceCache.set(json.id, json);
                }
            }
        });
    }
};

const getInputData = async (mcr) => {

    const inputList = getInputList(mcr);
    // console.log('input list', inputList);

    const dataList = [];
    const sourceCache = new Map();

    for (const dir of inputList) {

        const allFiles = fs.readdirSync(dir);
        if (!allFiles.length) {
            continue;
        }
        for (const filename of allFiles) {
            // only json file
            if (filename.endsWith('.json')) {
                await addJsonData(mcr, dataList, sourceCache, dir, filename);
            }
        }
    }

    await addEmptyData(mcr, dataList, sourceCache);

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
    const sourceData = sourceCache[url];
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
    const sourceCache = {};

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
            sourceCache[json.url] = json;
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

    const results = [];
    for (const filename of coverageList) {
        const coverageData = await readCoverageData(dir, filename, entryFilter, sourceCache);
        if (coverageData) {
            const res = await mcr.add(coverageData);
            results.push(res);
        }
    }

    return results;
};

module.exports = {
    getInputData,
    readFromDir,
    generateCoverageReports
};
