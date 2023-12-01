const fs = require('fs');
const path = require('path');
const defaultOptions = require('./options.js');
const Util = require('./utils/util.js');

const { initV8ListAndSourcemap } = require('./v8/v8.js');
const { getCoverageDataList, generateCoverageReport } = require('./generate.js');

class CoverageReport {

    static createCoverageReport = (options) => {
        return new CoverageReport(options);
    };

    constructor(options = {}) {
        this.cacheDirName = '.cache';
        this.options = {
            ... defaultOptions,
            ... options
        };
    }

    async initOptions() {

        this.options.logging = Util.initLoggingLevel(this.options.logging);

        this.options.outputFile = await Util.resolveOutputFile(this.options.outputFile);

        // outputDir for outputFile
        this.options.outputDir = Util.resolveOutputDir(this.options.outputFile);

        // cache dir, it is useful if runs in multiple processes.
        // cache coverage- data and source- files
        // it will be removed after generated if logging it not debug.
        this.options.cacheDir = Util.resolveCacheDir(this.options.outputDir, this.cacheDirName);
    }

    // (Array) V8 format
    // (Object) Istanbul format
    async add(data) {

        if (!Util.checkCoverageData(data)) {
            Util.logError('The coverage data must be Array(V8) or Object(Istanbul)');
            return;
        }

        // Util.logInfo('adding coverage report ...');
        await this.initOptions();

        const reportId = Util.uid();
        const reportName = `coverage-${reportId}.json`;
        const reportPath = path.resolve(this.options.cacheDir, reportName);

        const report = {
            id: reportId
        };

        if (Array.isArray(data)) {
            report.type = 'v8';
            // init v8list and unpack sourcemap
            const inlineSourceMap = false;
            report.data = await initV8ListAndSourcemap(data, this.options, inlineSourceMap);
        } else {
            report.type = 'istanbul';
            report.data = data;
        }

        // save report to cache dir
        const reportContent = JSON.stringify(report);
        await Util.writeFile(reportPath, reportContent);

        // return single report
        return report;
    }

    async generate() {

        Util.logInfo('generating coverage report ...');
        await this.initOptions();


        const outputDir = this.options.outputDir;
        if (!fs.existsSync(outputDir)) {
            Util.logError(`Not found output dir: ${outputDir}`);
            return;
        }

        // empty output dir except cache dir
        fs.readdirSync(outputDir).forEach((itemName) => {
            if (itemName === this.cacheDirName) {
                return;
            }
            Util.rmSync(path.resolve(outputDir, itemName));
        });

        const cacheDir = this.options.cacheDir;
        const dataList = await getCoverageDataList(cacheDir);
        if (!dataList) {
            Util.logError(`Not found coverage data: ${cacheDir}`);
            return;
        }

        const results = await generateCoverageReport(dataList, this.options);

        if (this.options.logging !== 'debug') {
            Util.rmSync(this.options.cacheDir);
        }

        return results;
    }

    // cache clean
    async clean() {
        // clean previous artifacts
        await this.initOptions();
        Util.rmSync(this.options.cacheDir);
    }

}

module.exports = CoverageReport;
