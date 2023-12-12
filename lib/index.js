const fs = require('fs');
const path = require('path');
const defaultOptions = require('./default/options.js');
const Util = require('./utils/util.js');

const { initV8ListAndSourcemap } = require('./v8/v8.js');
const { getCoverageDataList, generateCoverageReports } = require('./generate.js');

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

    initOptions() {

        if (this.fixedOptions) {
            return;
        }

        // init logging for clean after generated
        this.logging = Util.initLoggingLevel(this.options.logging);

        // init outputDir
        const outputDir = `${this.options.outputDir || defaultOptions.outputDir}`;
        this.options.outputDir = outputDir;

        // cache dir, it is useful if runs in multiple processes.
        // cache coverage- data and source- files
        // it will be removed after generated if logging it not debug.
        const cacheDir = path.resolve(outputDir, this.cacheDirName);
        this.options.cacheDir = cacheDir;

        this.fixedOptions = true;
    }

    // add coverage data: (Array) V8 format, (Object) Istanbul format
    async add(data) {

        this.initOptions();

        if (!Util.checkCoverageData(data)) {
            Util.logError(`The coverage data must be Array(V8) or Object(Istanbul): ${this.options.name}`);
            return;
        }

        const dataId = Util.uid();
        const dataName = `coverage-${dataId}.json`;
        const dataPath = path.resolve(this.options.cacheDir, dataName);

        const results = {
            id: dataId,
            path: dataPath
        };

        if (Array.isArray(data)) {
            results.type = 'v8';
            // init v8list and unpack sourcemap
            const inlineSourceMap = false;
            results.data = await initV8ListAndSourcemap(data, this.options, inlineSourceMap);
        } else {
            results.type = 'istanbul';
            results.data = data;
        }

        // save data to cache dir
        const dataContent = JSON.stringify(results);
        await Util.writeFile(dataPath, dataContent);

        return results;
    }

    // generate report
    async generate() {

        if (!this.hasCache()) {
            Util.logError(`Not found coverage cache: ${this.options.cacheDir}`);
            return;
        }

        const cacheDir = this.options.cacheDir;
        const dataList = await getCoverageDataList(cacheDir);
        if (!dataList) {
            Util.logError(`Not found coverage data in cache dir: ${cacheDir}`);
            return;
        }

        // empty output dir except cache dir before generate reports
        const outputDir = this.options.outputDir;
        // if assets dir is out of output dir will be ignore
        fs.readdirSync(outputDir).forEach((itemName) => {
            if (itemName === this.cacheDirName) {
                return;
            }
            Util.rmSync(path.resolve(outputDir, itemName));
        });

        const coverageResults = await generateCoverageReports(dataList, this.options);

        if (this.logging !== 'debug') {
            Util.rmSync(cacheDir);
        }

        const onEnd = this.options.onEnd;
        if (typeof onEnd === 'function') {
            await onEnd(coverageResults);
        }

        return coverageResults;
    }

    // check if cache dir exists
    hasCache() {
        this.initOptions();
        return fs.existsSync(this.options.cacheDir);
    }

    // cache clean
    cleanCache() {
        // clean previous artifacts
        if (this.hasCache()) {
            Util.rmSync(this.options.cacheDir);
            return true;
        }
        return false;
    }

}

module.exports = CoverageReport;
