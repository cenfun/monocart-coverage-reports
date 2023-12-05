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

        if (this.hasOptions) {
            return;
        }

        this.options.logging = Util.initLoggingLevel(this.options.logging);

        this.options.outputFile = await Util.resolveOutputFile(this.options.outputFile);

        // outputDir for outputFile
        this.options.outputDir = Util.resolveOutputDir(this.options.outputFile);

        // cache dir, it is useful if runs in multiple processes.
        // cache coverage- data and source- files
        // it will be removed after generated if logging it not debug.
        this.options.cacheDir = Util.resolveCacheDir(this.options.outputDir, this.cacheDirName);

        this.hasOptions = true;
    }

    // add coverage data: (Array) V8 format, (Object) Istanbul format
    async add(data) {

        await this.initOptions();

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

        const cacheDir = await this.getCacheDir();
        if (!cacheDir) {
            Util.logError(`Not found coverage cache dir: ${cacheDir}`);
            return;
        }

        const outputDir = this.options.outputDir;
        // empty output dir except cache dir
        // if assets dir is out of output dir will be ignore
        fs.readdirSync(outputDir).forEach((itemName) => {
            if (itemName === this.cacheDirName) {
                return;
            }
            Util.rmSync(path.resolve(outputDir, itemName));
        });

        const dataList = await getCoverageDataList(cacheDir);
        if (!dataList) {
            Util.logError(`Not found coverage data: ${cacheDir}`);
            return;
        }

        const report = await generateCoverageReport(dataList, this.options);

        if (this.options.logging !== 'debug') {
            Util.rmSync(cacheDir);
        }

        return report;
    }

    // check if cache dir exists
    async getCacheDir() {
        await this.initOptions();
        // check cache dir
        const cacheDir = this.options.cacheDir;
        if (fs.existsSync(cacheDir)) {
            return cacheDir;
        }
    }

    // cache clean
    async cleanCache() {
        // clean previous artifacts
        await this.initOptions();
        Util.rmSync(this.options.cacheDir);
    }

}

module.exports = CoverageReport;
