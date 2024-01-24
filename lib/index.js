const fs = require('fs');
const path = require('path');
const defaultOptions = require('./default/options.js');
const Util = require('./utils/util.js');

const { initV8ListAndSourcemap } = require('./v8/v8.js');
const { getInputData, generateCoverageReports } = require('./generate.js');

class CoverageReport {

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

    // add coverage data: {array} V8 format, {object} Istanbul format
    async add(data) {

        this.initOptions();

        if (!Util.checkCoverageData(data)) {
            Util.logError(`${this.options.name}: The added coverage data must be Array(V8) or Object(Istanbul)`);
            return;
        }

        // const time_start = Date.now();
        const dataId = Util.uid();
        const dataName = `coverage-${dataId}.json`;
        const dataPath = path.resolve(this.options.cacheDir, dataName);

        const results = {
            id: dataId,
            path: dataPath
        };

        if (Array.isArray(data)) {
            results.type = 'v8';
            results.data = await initV8ListAndSourcemap(data, this.options);
        } else {
            results.type = 'istanbul';
            results.data = data;
        }

        // save data to cache dir
        const dataContent = JSON.stringify(results);
        await Util.writeFile(dataPath, dataContent);

        // Util.logTime('added coverage data', time_start);

        return results;
    }

    // generate report
    async generate() {

        this.initOptions();

        const { inputDir, cacheDir } = this.options;
        const inputDirs = Util.toList(inputDir, ',');
        inputDirs.push(cacheDir);

        const inputList = inputDirs.filter((dir) => {
            const hasDir = fs.existsSync(dir);
            if (!hasDir) {
                Util.logError(`Not found coverage data dir: ${Util.relativePath(dir)}`);
            }
            return hasDir;
        });

        if (!inputList.length) {
            return;
        }

        const time_start = Date.now();
        const { dataList, sourceCache } = await getInputData(inputList);
        if (!dataList.length) {
            const dirs = inputList.map((dir) => Util.relativePath(dir));
            Util.logError(`Not found coverage data in dir(s): ${dirs.join(', ')}`);
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

        const coverageResults = await generateCoverageReports(dataList, sourceCache, this.options);

        if (this.logging !== 'debug') {
            Util.rmSync(cacheDir);
        }

        Util.logTime('generated coverage report', time_start);

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

/** create coverage report */
const MCR = function(options) {
    return new CoverageReport(options);
};
MCR.CoverageReport = CoverageReport;

module.exports = MCR;
