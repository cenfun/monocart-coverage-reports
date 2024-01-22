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

    // add lcovonly report
    if (lcov) {
        reportMap.lcovonly = {};
    }

    const defaultReport = dataType === 'v8' ? 'v8' : 'html';

    if (Util.isList(reports)) {
        reports.forEach((it) => {
            if (Util.isList(it)) {
                // ["v8"]
                reportMap[it[0]] = {
                    ... it[1]
                };
                return;
            }
            if (typeof it === 'string') {
                reportMap[it] = {};
                return;
            }
            reportMap[defaultReport] = {};
        });
    } else if (typeof reports === 'string' && reports) {
        reportMap[reports] = {};
    } else {
        reportMap[defaultReport] = {};
    }

    const allSupportedReports = {

        // v8
        'v8': 'v8',
        'v8-json': 'v8',
        'codecov': 'v8',

        // both
        'console-summary': 'both',

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
        'text-summary': 'istanbul'
    };

    // group v8 and istanbul
    const reportGroup = {};
    Object.keys(reportMap).forEach((k) => {
        const options = reportMap[k];

        let type = allSupportedReports[k];
        if (!type) {
            type = options.type || 'v8';
        }

        let group = reportGroup[type];
        if (!group) {
            group = {};
            reportGroup[type] = group;
        }

        group[k] = options;

    });

    return reportGroup;
};

// ========================================================================================================

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const pFormatter = (v, row, column) => {
    if (typeof v === 'number') {
        const p = Util.PSF(v, 100, 2);
        if (row.status === 'low') {
            return EC.red(p);
        }
        if (row.status === 'medium') {
            return EC.yellow(p);
        }
        if (row.status === 'high') {
            return EC.green(p);
        }
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

    const { metrics } = reportOptions;

    const {
        summary, name, type
    } = reportData;

    if (name) {
        EC.logCyan(name);
    }

    const allMetrics = {
        v8: ['bytes', 'functions', 'branches', 'lines'],
        istanbul: ['statements', 'functions', 'branches', 'lines']
    };

    let list = allMetrics[type];
    if (Util.isList(metrics)) {
        const newList = list.filter((k) => metrics.includes(k));
        if (newList.length) {
            list = newList;
        }
    }

    const rows = list.map((k) => {
        return {
            ... summary[k],
            name: capitalizeFirstLetter(k)
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


// ========================================================================================================

const getCoverageResults = async (dataList, options) => {
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
        const v8list = await mergeV8Coverage(dataList, options);
        // console.log('after merge', v8list.map((it) => it.url));

        const { coverageData, fileSources } = await convertV8List(v8list, options);
        return generateV8ListReports(v8list, coverageData, fileSources, options);

    }

    // istanbul data
    const istanbulData = mergeIstanbulCoverage(dataList, options);
    const { coverageData, fileSources } = initIstanbulData(istanbulData, options);
    return saveIstanbulReports(coverageData, fileSources, options);
};

const generateCoverageReports = async (dataList, options) => {
    const coverageResults = await getCoverageResults(dataList, options);

    // [ 'type', 'reportPath', 'name', 'watermarks', 'summary', 'files' ]
    // console.log(Object.keys(coverageResults));

    const buildInBothReports = {
        'console-summary': showConsoleSummary
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


const getCoverageDataList = async (cacheDir) => {
    const files = fs.readdirSync(cacheDir).filter((f) => f.startsWith('coverage-'));
    if (!files.length) {
        return;
    }

    const dataList = [];
    for (const item of files) {
        const content = await Util.readFile(path.resolve(cacheDir, item));
        if (content) {
            dataList.push(JSON.parse(content));
        }
    }

    if (dataList.length) {
        return dataList;
    }
};

module.exports = {
    getCoverageDataList,
    generateCoverageReports
};
