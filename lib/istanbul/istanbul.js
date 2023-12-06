const fs = require('fs');
const istanbulReports = require('istanbul-reports');
const istanbulLibCoverage = require('istanbul-lib-coverage');
const istanbulLibReport = require('istanbul-lib-report');

const Util = require('../utils/util.js');
const IstanbulSummary = require('./istanbul-summary.js');

const { initIstanbulSourcePath } = require('../converter/source-path.js');

const saveIstanbulReports = (coverageData, fileSources, options) => {

    const coverageMap = istanbulLibCoverage.createCoverageMap(coverageData);

    const defaultWatermarks = {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        lines: [50, 80]
    };
    const istanbulOptions = {
        watermarks: Util.resolveWatermarks(defaultWatermarks, options.watermarks),
        defaultSummarizer: options.defaultSummarizer
    };

    // https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-report
    const contextOptions = {
        // The summarizer to default to (may be overridden by some reports)
        // values can be nested/flat/pkg. Defaults to 'pkg'
        defaultSummarizer: 'nested',

        ... istanbulOptions,

        dir: options.outputDir,
        sourceFinder: (filePath) => {

            // console.log(`find file source: ${filePath}`);

            if (fileSources) {
                const source = fileSources[filePath];
                if (source) {
                    return source;
                }
            }

            if (typeof options.sourceFinder === 'function') {
                const source = options.sourceFinder(filePath);
                if (source) {
                    return source;
                }
            }

            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }

            // console.log('Not found source file:', filePath);

            return `Not found source file: ${filePath}`;
        },
        coverageMap
    };

    // create a context for report generation
    const context = istanbulLibReport.createContext(contextOptions);

    const istanbulMap = options.reportGroup.istanbul;
    Object.keys(istanbulMap).forEach((reportName) => {
        const report = istanbulReports.create(reportName, istanbulMap[reportName]);
        report.execute(context);
    });

    // add watermarks and color
    const coverageReport = new IstanbulSummary();
    coverageReport.execute(context);
    const report = {
        name: options.name,
        watermarks: contextOptions.watermarks,
        ... coverageReport.getReport()
    };

    return report;
};

const mergeIstanbulCoverage = (dataList, options) => {
    const coverageMap = istanbulLibCoverage.createCoverageMap();
    dataList.forEach((d) => {
        coverageMap.merge(d.data);
    });

    const istanbulData = coverageMap.toJSON();

    return istanbulData;
};

const initIstanbulData = (istanbulData, options) => {

    // force to istanbul, true is defaults to html-spa
    if (!options.toIstanbul) {
        options.toIstanbul = true;
    }

    const fileSources = options.fileSources || {};

    const coverageData = initIstanbulSourcePath(istanbulData, fileSources, options.sourcePath);

    return {
        fileSources,
        coverageData
    };
};

module.exports = {
    saveIstanbulReports,
    mergeIstanbulCoverage,
    initIstanbulData
};
