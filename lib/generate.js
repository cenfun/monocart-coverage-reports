const fs = require('fs');
const path = require('path');
const CG = require('console-grid');
const EC = require('eight-colors');
const Util = require('./utils/util.js');
const {
    initIstanbulData, mergeIstanbulCoverage, saveIstanbulReports
} = require('./istanbul/istanbul.js');

const { mergeV8Coverage, saveV8Report } = require('./v8/v8.js');

const { convertV8List } = require('./converter/converter.js');

// ========================================================================================================

// maybe v8 or to istanbul reports
const generateV8ListReports = async (v8list, coverageData, fileSources, options) => {

    let report;

    const { v8, istanbul } = options.reportGroup;

    // generate istanbul reports first
    if (istanbul) {
        report = await saveIstanbulReports(coverageData, fileSources, options);
    }

    // generate v8 report
    if (v8) {
        report = await saveV8Report(v8list, options);
    }

    return report;
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
        'codecov': 'v8',
        'console-details': 'v8',

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

const showConsoleSummary = (reportData, reportOptions, options) => {

    const csOptions = {
        metrics: [],
        ... reportOptions
    };

    const {
        summary, name, type
    } = reportData;

    if (name) {
        EC.logCyan(name);
    }

    const metrics = Util.getMetrics(type, csOptions.metrics);

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

const saveRawReport = (reportData, reportOptions, options) => {
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

        // only debug level
        const time_start = Date.now();
        const results = convertV8List(v8list, options);
        const {
            v8DataList, coverageData, fileSources
        } = results;
        Util.logTime(`converted v8 data: ${v8DataList.length}`, time_start);

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
        'console-summary': showConsoleSummary,
        'raw': saveRawReport
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


const getInputData = async (inputList) => {
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
    return {
        dataList,
        sourceCache
    };
};

module.exports = {
    getInputData,
    generateCoverageReports
};
