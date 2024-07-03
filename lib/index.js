const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const EC = require('eight-colors');

const defaultOptions = require('./default/options.js');
const Util = require('./utils/util.js');

const { initV8ListAndSourcemap, getEntryFilter } = require('./v8/v8.js');
const {
    getInputData, readFromDir, generateCoverageReports
} = require('./generate.js');
const { getSnapshot, diffSnapshot } = require('./utils/snapshot.js');

const WSSession = require('./client/ws-session.js');
const CDPClient = require('./client/cdp-client.js');

const resolveConfigOptions = async (configPath) => {
    // json format
    const ext = path.extname(configPath);
    if (ext === '.json' || configPath.slice(-2) === 'rc') {
        return JSON.parse(Util.readFileSync(configPath));
    }

    let configOptions;
    let err;
    try {
        configOptions = await import(pathToFileURL(configPath));
    } catch (ee) {
        err = ee;
    }

    if (err) {
        Util.logError(`ERROR: failed to load config "${configPath}": ${err && err.message} `);
        return;
    }

    // could be multiple level default
    while (configOptions && configOptions.default) {
        configOptions = configOptions.default;
    }

    return configOptions;
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
        const results = await readFromDir(this, dir);
        Util.logTime(`added from dir: ${dir}`, time_start);
        return results;
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

        Util.logTime('┌ [generate] prepared coverage data', time_start);

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
        return getEntryFilter(this.options);
    }

    // load config file
    async loadConfig(customConfigFile) {

        const configPath = Util.findUpConfig(customConfigFile);
        if (!configPath) {
            if (customConfigFile) {
                Util.logError(`The config file does not exist: ${customConfigFile}`);
            }
            // not found config
            return;
        }

        const configOptions = await resolveConfigOptions(configPath);
        if (!configOptions) {
            // failed to load config options
            if (customConfigFile) {
                Util.logError(`Failed to load config file: ${customConfigFile}`);
            }
            return;
        }

        Util.logInfo(`Loaded: ${EC.cyan(configPath)}`);

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
MCR.getSnapshot = getSnapshot;
MCR.diffSnapshot = diffSnapshot;
MCR.WSSession = WSSession;
MCR.CDPClient = CDPClient;
MCR.Util = Util;

module.exports = MCR;
