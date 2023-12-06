const fs = require('fs');
const path = require('path');

const istanbulReports = require('istanbul-reports');
const istanbulLibCoverage = require('istanbul-lib-coverage');
const istanbulLibReport = require('istanbul-lib-report');

const Util = require('../utils/util.js');
const IstanbulSummary = require('./istanbul-summary.js');

const { initIstanbulSourcePath } = require('../converter/source-path.js');

const getIstanbulReportList = (toIstanbul) => {
    if (typeof toIstanbul === 'boolean') {
        return [{
            name: 'html-spa',
            options: {}
        }];
    }

    if (typeof toIstanbul === 'string') {
        return [{
            name: toIstanbul,
            options: {}
        }];
    }

    if (Array.isArray(toIstanbul)) {
        return toIstanbul.map((item) => {
            if (typeof item === 'string') {
                return {
                    name: item,
                    options: {}
                };
            }
            if (item && item.name) {
                return item;
            }
        }).filter((it) => it);
    }

    return [{
        name: 'html-spa',
        options: {}
    }];
};

const findHtmlPath = (outputDir) => {
    const defaultHtml = path.resolve(outputDir, 'index.html');
    if (fs.existsSync(defaultHtml)) {
        return defaultHtml;
    }

    let htmlPath;
    const fileList = [];
    Util.forEachFile(outputDir, ['.html', '.json', '.info'], (name, dir) => {
        if (name === 'index.html') {
            htmlPath = path.resolve(dir, name);
            return 'break';
        }
        fileList.push({
            name,
            dir
        });
    });

    if (htmlPath) {
        return htmlPath;
    }

    if (fileList.length) {
        const f = fileList[0];
        return path.resolve(f.dir, f.name);
    }

    return path.resolve(outputDir, 'not-found-index.html');

};

const saveIstanbulReport = (coverageData, fileSources, options) => {

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

    // istanbul reports
    let lcovCreated = false;
    if (options.toIstanbul) {
        const reportList = getIstanbulReportList(options.toIstanbul);
        reportList.forEach((item) => {
            if (item.name === 'lcovonly') {
                lcovCreated = true;
            }
            const report = istanbulReports.create(item.name, item.options || {});
            report.execute(context);
        });
    }

    // lcov
    if (!lcovCreated && options.lcov) {
        const lcovReport = istanbulReports.create('lcovonly', {});
        lcovReport.execute(context);
    }

    let htmlPath = findHtmlPath(options.outputDir);
    htmlPath = Util.relativePath(htmlPath);

    // add watermarks and color
    const coverageReport = new IstanbulSummary();
    coverageReport.execute(context);
    const report = {
        name: options.name,
        htmlPath,
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
    saveIstanbulReport,
    mergeIstanbulCoverage,
    initIstanbulData
};
