import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import EC from 'eight-colors';

import { defaultOptions } from './default/options.js';
import { Util } from './utils/util.js';

import { initV8ListAndSourcemap } from './v8/v8.js';
import {
    getInputData, readFromDir, generateCoverageReports
} from './generate.js';
import { getSnapshot, diffSnapshot } from './utils/snapshot.js';

import { WSSession } from './client/ws-session.js';
import { CDPClient } from './client/cdp-client.js';
import { CoverageClient } from './client/coverage-client.js';

const resolveConfigOptions = async (configPath) => {
    try {
        // json format
        const ext = path.extname(configPath);
        if (ext === '.json' || configPath.slice(-2) === 'rc') {
            return JSON.parse(Util.readFileSync(configPath));
        }

        let configOptions = await import(pathToFileURL(configPath));
        // could be multiple level default
        while (configOptions && configOptions.default) {
            configOptions = configOptions.default;
        }
        return configOptions;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load config file "${configPath}": ${message}`, {
            cause: error
        });
    }
};

class CoverageReport {

    constructor(options = {}) {
        this.cacheDirName = '.cache';
        this.constructorOptions = options;
        this.options = {
            ... defaultOptions,
            ... options
        };
        this.initOptions();
        this.fileCache = new Map();
    }

    initOptions(force) {

        if (this.fixedOptions && !force) {
            return;
        }

        // before clean cache, do no call initOptions again in hasCache
        this.fixedOptions = true;

        // init logging for clean after generated
        this.logging = Util.initLoggingLevel(this.options.logging);

        if (Util.isNum(this.options.gc)) {
            Util.setGC(this.options.gc);
        }

        // init outputDir
        const outputDir = `${this.options.outputDir || defaultOptions.outputDir}`;
        this.options.outputDir = outputDir;

        // cache dir, it is useful if runs in multiple processes.
        // cache coverage- data and source- files
        // it will be removed after generated if logging it not debug.
        const cacheDir = path.resolve(outputDir, this.cacheDirName);
        this.options.cacheDir = cacheDir;

        // If true, the API `cleanCache()` will execute automatically.
        if (this.options.cleanCache) {
            this.cleanCache();
        }

    }

    // add coverage data: {array} V8 format, {object} Istanbul format
    async add(data) {

        const time_start = Date.now();

        this.initOptions();

        if (!Util.checkCoverageData(data)) {
            Util.logError(`${this.options.name}: The added coverage data must be Array(V8) or Object(Istanbul)`);
            return;
        }

        const dataId = Util.uid();
        const results = {
            id: dataId
        };

        if (Array.isArray(data)) {
            results.type = 'v8';
            // could be empty list after entryFilter
            results.data = await initV8ListAndSourcemap(this, data);
        } else {
            results.type = 'istanbul';
            results.data = data;
        }

        // save data to cache
        const { cacheName, cachePath } = Util.getCacheFileInfo('coverage', dataId, this.options.cacheDir);
        this.fileCache.set(cacheName, results);
        await Util.writeFile(cachePath, JSON.stringify(results));

        Util.logTime(`added coverage data: ${results.type}`, time_start);

        return results;
    }

    // add coverage from dir
    async addFromDir(dir) {
        const time_start = Date.now();
        await readFromDir(this, dir);
        Util.logTime(`added from dir: ${dir}`, time_start);
    }

    // generate report
    async generate() {

        const time_start = Date.now();

        this.initOptions();

        const dataDir = this.options.dataDir;
        if (dataDir) {
            await this.addFromDir(dataDir);
        }

        const inputData = await getInputData(this);
        if (!inputData) {
            return;
        }

        // GC, no OOM
        this.fileCache.clear();

        const { dataList, sourceCache } = inputData;

        // empty output dir except cache dir before generate reports
        const outputDir = this.options.outputDir;

        if (fs.existsSync(outputDir)) {
            // if assets dir is out of output dir will be ignore
            if (this.options.clean) {
                this.clean();
            }
        } else {
            fs.mkdirSync(outputDir, {
                recursive: true
            });
        }

        Util.logTime(`${EC.magenta('├')} [generate] prepared coverage data`, time_start);

        const coverageResults = await generateCoverageReports(dataList, sourceCache, this.options);

        const onEnd = this.options.onEnd;
        if (typeof onEnd === 'function') {
            await onEnd.call(this, coverageResults);
        }

        // remove cache dir after finished
        if (!Util.isDebug()) {
            Util.rmSync(this.options.cacheDir);
        }

        let reportPath = '';
        if (coverageResults.reportPath) {
            reportPath = EC.cyan(coverageResults.reportPath);
        }
        Util.logTime(`generated coverage reports: ${reportPath}`, time_start);

        return coverageResults;
    }

    // check if cache dir exists
    hasCache() {
        this.initOptions();
        return fs.existsSync(this.options.cacheDir);
    }

    // cache clean dir
    cleanCache() {
        // clean previous artifacts
        if (this.hasCache()) {
            Util.rmSync(this.options.cacheDir);
            return true;
        }
        return false;
    }

    // clean previous reports except cache dir and v8 coverage dir
    clean() {
        const outputDir = this.options.outputDir;
        let v8DirName;
        const nodeV8CoverageDir = process.env.NODE_V8_COVERAGE;
        if (nodeV8CoverageDir) {
            v8DirName = path.relative(outputDir, nodeV8CoverageDir);
        }
        fs.readdirSync(outputDir).forEach((itemName) => {
            if (itemName === this.cacheDirName) {
                return;
            }
            if (itemName === v8DirName) {
                return;
            }
            Util.rmSync(path.resolve(outputDir, itemName));
        });
    }

    // get entry filter handler
    getEntryFilter() {
        return Util.getEntryFilter(this.options);
    }

    // load config file
    async loadConfig(customConfigFile) {

        const configPath = Util.findUpConfig(customConfigFile);
        if (!configPath) {
            if (customConfigFile) {
                throw new Error(`The config file does not exist: ${customConfigFile}`);
            }
            // not found config
            return;
        }

        const configOptions = await resolveConfigOptions(configPath);
        if (!configOptions) {
            throw new Error(`Failed to load config file: ${configPath}`);
        }

        Util.logInfo(`Loaded: ${EC.cyan(Util.relativePath(configPath))}`);

        // init options again
        this.options = {
            ... defaultOptions,
            ... configOptions,
            ... this.constructorOptions
        };
        this.initOptions(true);

    }

}

/** create coverage report */
const MCR = function(options) {
    return new CoverageReport(options);
};
MCR.CoverageReport = CoverageReport;
MCR.CoverageClient = CoverageClient;
MCR.getSnapshot = getSnapshot;
MCR.diffSnapshot = diffSnapshot;
MCR.WSSession = WSSession;
MCR.CDPClient = CDPClient;
MCR.Util = Util;

export {
    MCR as default, MCR, CoverageReport, CoverageClient, getSnapshot, diffSnapshot, WSSession, CDPClient, Util
};
