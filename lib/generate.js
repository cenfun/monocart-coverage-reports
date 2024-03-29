const fs = require('fs');
const path = require('path');
const CG = require('console-grid');
const EC = require('eight-colors');
const { pathToFileURL, fileURLToPath } = require('url');

const Util = require('./utils/util.js');
const {
    initIstanbulData, mergeIstanbulCoverage, saveIstanbulReports
} = require('./istanbul/istanbul.js');

const { mergeV8Coverage, saveV8Report } = require('./v8/v8.js');

const { convertV8List } = require('./converter/converter.js');
const { resolveSourceMap } = require('./converter/collect-source-maps.js');

const { minimatch } = require('./packages/monocart-coverage-vendor.js');
const { getGroupedRows } = require('./utils/snapshot.js');

// ========================================================================================================

// maybe v8 or to istanbul reports
const generateV8ListReports = async (v8list, coverageData, fileSources, options) => {
    const time_start = Date.now();
    let istanbulReportPath;
    // v8 to istanbul reports
    if (options.reportGroup.istanbul) {
        const istanbulCoverageResults = await saveIstanbulReports(coverageData, fileSources, options);
        istanbulReportPath = istanbulCoverageResults.reportPath;
    }

    // v8 reports and v8 coverage results
    // could be no v8 or v8-json, but requires v8 coverage results
    const v8CoverageResults = await saveV8Report(v8list, options, istanbulReportPath);
    Util.logTime('- saved coverage reports', time_start);
    return v8CoverageResults;
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

    const allBuildInReports = {
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
        'console-details': 'both',
        'console-summary': 'both',
        'raw': 'both'
    };

    // group v8 and istanbul
    const reportGroup = {};
    Object.keys(reportMap).forEach((k) => {
        const options = reportMap[k];

        let type = allBuildInReports[k];
        if (!type) {
            // for custom reporter
            type = options.type || 'v8';
        }

        let group = reportGroup[type];
        if (!group) {
            group = {};
            reportGroup[type] = group;
        }

        group[k] = options;

    });

    // requires a default istanbul report if data is istanbul
    if (dataType === 'istanbul' && !reportGroup.istanbul) {
        reportGroup.istanbul = {
            html: {}
        };
    }

    return reportGroup;
};

// ========================================================================================================

const pFormatter = (v, row, column) => {
    if (typeof v === 'number') {
        return Util.getColorStrByStatus(Util.PSF(v, 100, 2), row.status);
    }
    return v;
};

const nFormatter = (v) => {
    if (typeof v === 'number') {
        return Util.NF(v);
    }
    return v;
};

const getRowData = (rowName, summary, metrics) => {
    const summaryRow = {};
    let lowest = {
        pct: 100,
        status: 'high'
    };
    metrics.map((k) => {
        const s = summary[k];
        if (!s) {
            return;
        }
        const percent = s.pct;
        if (typeof percent !== 'number') {
            return;
        }
        summaryRow[k] = Util.getColorStrByStatus(Util.PSF(percent, 100, 2), s.status);
        if (percent < lowest.pct) {
            lowest = s;
        }
    });
    summaryRow.nameStatus = lowest.status;
    summaryRow.name = rowName;
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

const getDetailsRows = (files, metrics, cdOptions) => {

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

    const flatRows = [];
    files.forEach((file) => {

        // do NOT add debug file
        if (file.debug) {
            return;
        }

        const { sourcePath, summary } = file;
        const fileRow = getRowData(sourcePath, summary, metrics);
        fileRow.uncoveredLines = getUncoveredLines(file);
        flatRows.push(fileRow);
    });

    return getGroupedRows(flatRows);
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

const handleConsoleDetailsReport = (reportData, reportOptions, options) => {
    const cdOptions = {
        maxCols: 50,
        skipPercent: 0,
        metrics: [],
        ... reportOptions
    };

    const {
        type, name, summary, files
    } = reportData;

    if (name) {
        Util.logInfo(EC.cyan(name));
    }

    const metrics = Util.getMetrics(cdOptions.metrics, type);
    const rows = getDetailsRows(files, metrics, cdOptions);
    const summaryRow = getRowData('Summary', summary, metrics);
    if (summaryRow.nameStatus) {
        summaryRow.name = Util.getColorStrByStatus(summaryRow.name, summaryRow.nameStatus);
    }
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

    return CG({
        options: {
            silent: cdOptions.silent,
            nullPlaceholder: '',
            defaultMaxWidth: cdOptions.maxCols
        },
        columns,
        rows
    });
};

const handleConsoleSummaryReport = (reportData, reportOptions, options) => {

    const csOptions = {
        metrics: [],
        ... reportOptions
    };

    const {
        summary, name, type
    } = reportData;

    if (name) {
        Util.logInfo(EC.cyan(name));
    }

    const metrics = Util.getMetrics(csOptions.metrics, type);

    const rows = metrics.map((k) => {
        return {
            ... summary[k],
            name: Util.capitalizeFirstLetter(k)
        };
    });

    const columns = [{
        id: 'name',
        name: 'Name'
    }, {
        id: 'pct',
        name: 'Coverage %',
        align: 'right',
        formatter: pFormatter
    }, {
        id: 'covered',
        name: 'Covered',
        align: 'right',
        formatter: nFormatter
    }, {
        id: 'uncovered',
        name: 'Uncovered',
        align: 'right',
        formatter: nFormatter
    }, {
        id: 'total',
        name: 'Total',
        align: 'right',
        formatter: nFormatter
    }];

    CG({
        columns,
        rows
    });
};

const handleRawReport = (reportData, reportOptions, options) => {
    const rawOptions = {
        outputDir: 'raw',
        ... reportOptions
    };

    const cacheDir = options.cacheDir;
    const rawDir = path.resolve(options.outputDir, rawOptions.outputDir);
    // console.log(rawDir, cacheDir);
    if (fs.existsSync(rawDir)) {
        Util.logError(`Failed to save raw report because the dir already exists: ${Util.relativePath(rawDir)}`);
        return;
    }

    const rawParent = path.dirname(rawDir);
    if (!fs.existsSync(rawParent)) {
        fs.mkdirSync(rawParent, {
            recursive: true
        });
    }

    // just rename the cache folder name
    fs.renameSync(cacheDir, rawDir);

};


// ========================================================================================================

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
        const v8list = await mergeV8Coverage(dataList, sourceCache, options);
        // console.log('after merge', v8list.map((it) => it.url));
        const results = convertV8List(v8list, options);
        const {
            v8DataList, coverageData, fileSources
        } = results;
        return generateV8ListReports(v8DataList, coverageData, fileSources, options);
    }

    // istanbul data
    const istanbulData = mergeIstanbulCoverage(dataList);
    const { coverageData, fileSources } = initIstanbulData(istanbulData, options);
    return saveIstanbulReports(coverageData, fileSources, options);
};

const generateCoverageReports = async (dataList, sourceCache, options) => {
    const coverageResults = await getCoverageResults(dataList, sourceCache, options);

    // [ 'type', 'reportPath', 'name', 'watermarks', 'summary', 'files' ]
    // console.log(Object.keys(coverageResults));

    const buildInBothReports = {
        'codecov': handleCodecovReport,
        'console-details': handleConsoleDetailsReport,
        'console-summary': handleConsoleSummaryReport,
        'raw': handleRawReport
    };

    const bothGroup = options.reportGroup.both;
    if (bothGroup) {
        const bothReports = Object.keys(bothGroup);
        for (const reportName of bothReports) {
            const reportOptions = bothGroup[reportName];
            const buildInHandler = buildInBothReports[reportName];
            if (buildInHandler) {
                await buildInHandler(coverageResults, reportOptions, options);
            } else {
                await Util.runCustomReporter(reportName, coverageResults, reportOptions, options);
            }
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
        return (filePath) => {
            return minimatch(filePath, input);
        };
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
    if (typeof input === 'string' || Array.isArray(input)) {
        dir = input;
        filter = () => true;
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


const getInputData = async (inputList, all, cacheDir, addHandler) => {
    const dataList = [];
    const sourceCache = new Map();

    const addJsonData = async (dir, filename) => {
        const isCoverage = filename.startsWith('coverage-');
        const isSource = filename.startsWith('source-');
        if (isCoverage || isSource) {
            const content = await Util.readFile(path.resolve(dir, filename));
            if (content) {
                const json = JSON.parse(content);
                if (isCoverage) {
                    dataList.push(json);
                } else {
                    sourceCache.set(json.id, json);
                }
            }
        }
    };

    for (const dir of inputList) {
        const allFiles = fs.readdirSync(dir);
        if (!allFiles.length) {
            continue;
        }
        for (const filename of allFiles) {
            // only json file
            if (filename.endsWith('.json')) {
                await addJsonData(dir, filename);
            }
        }
    }

    // add empty coverage for all files
    // dataList for data type, before `add` we don't which one is tested, because using hash id
    const emptyData = getEmptyData(all, dataList);
    if (emptyData) {
        Util.logDebug(`added empty files for all: ${EC.yellow(emptyData.length)}`);
        const coverageResults = await addHandler(emptyData);
        // after `add`
        if (coverageResults) {
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
                    const sourcePath = Util.resolveCacheSourcePath(cacheDir, id);
                    const content = Util.readFileSync(sourcePath);
                    if (content) {
                        const json = JSON.parse(content);
                        sourceCache.set(json.id, json);
                    }
                });
            }
        }
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

const readCoverageData = (filePath, entryFilter, sourceCache) => {

    const content = fs.readFileSync(filePath).toString('utf-8');
    if (!content) {
        return;
    }

    const json = JSON.parse(content);
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

const readFromDir = async (dir, entryFilter, addHandler) => {

    if (!dir || !fs.existsSync(dir)) {
        Util.logInfo(`Not found V8 coverage dir: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);
    if (!files.length) {
        Util.logInfo(`No coverage files in the dir: ${dir}`);
        return;
    }

    const coverageFiles = [];
    const sourceCache = {};
    files.forEach((filename) => {
        const isCoverage = filename.startsWith('coverage-');
        if (isCoverage) {
            coverageFiles.push(filename);
            return;
        }
        const isSource = filename.startsWith('source-');
        if (isSource) {
            const filePath = path.resolve(dir, filename);
            const content = fs.readFileSync(filePath).toString('utf-8');
            if (content) {
                const json = JSON.parse(content);
                if (json.url) {
                    sourceCache[json.url] = json;
                }
            }
        }
    });

    // filter before adding
    for (const filename of coverageFiles) {
        const filePath = path.resolve(dir, filename);
        const coverageData = readCoverageData(filePath, entryFilter, sourceCache);
        if (coverageData) {
            await addHandler(coverageData);
        }
    }

};

module.exports = {
    getInputData,
    readFromDir,
    generateCoverageReports
};
