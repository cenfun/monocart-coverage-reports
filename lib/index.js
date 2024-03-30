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
        const dataName = `coverage-${dataId}.json`;
        const dataPath = path.resolve(this.options.cacheDir, dataName);

        const results = {
            id: dataId
        };

        if (Array.isArray(data)) {
            results.type = 'v8';
            // could be empty list after entryFilter
            results.data = await initV8ListAndSourcemap(data, this.options);
        } else {
            results.type = 'istanbul';
            results.data = data;
        }

        // save data to cache dir
        const dataContent = JSON.stringify(results);
        await Util.writeFile(dataPath, dataContent);

        Util.logTime(`added coverage data: ${results.type}`, time_start);

        return results;
    }

    // add coverage from dir
    addFromDir(dir) {
        const entryFilter = this.getEntryFilter();
        return readFromDir(dir, entryFilter, (coverageData) => {
            return this.add(coverageData);
        });
    }

    // generate report
    async generate() {

        const time_start = Date.now();

        this.initOptions();

        const {
            all, inputDir, cacheDir
        } = this.options;

        const inputDirs = Util.toList(inputDir, ',');
        if (this.hasCache()) {
            inputDirs.push(cacheDir);
        }

        const inputList = inputDirs.filter((dir) => {
            const hasDir = fs.existsSync(dir);
            if (!hasDir) {
                // could be empty
                Util.logInfo(`Not found coverage data dir: ${Util.relativePath(dir)}`);
            }
            return hasDir;
        });

        const { dataList, sourceCache } = await getInputData(inputList, all, cacheDir, (emptyData) => {
            return this.add(emptyData);
        });

        if (!dataList.length) {
            const dirs = inputList.map((dir) => Util.relativePath(dir));
            Util.logError(`Not found coverage data in dir(s): ${dirs.join(', ')}`);
            return;
        }

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

        const coverageResults = await generateCoverageReports(dataList, sourceCache, this.options);

        if (this.logging !== 'debug') {
            Util.rmSync(cacheDir);
        }

        Util.logTime(`generated coverage reports: ${EC.cyan(coverageResults.reportPath)}`, time_start);

        const onEnd = this.options.onEnd;
        if (typeof onEnd === 'function') {
            await onEnd.call(this, coverageResults);
        }

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

        // order by priority
        const configList = customConfigFile ? [customConfigFile] : [
            'mcr.config.js',
            'mcr.config.cjs',
            'mcr.config.mjs',
            'mcr.config.json',
            'mcr.config.ts',
            '.mcrrc.js',
            '.mcrrc'
        ];

        const existsList = configList.filter((p) => p && fs.existsSync(p));
        if (!existsList.length) {
            if (customConfigFile) {
                Util.logError(`The config file does not exist: ${customConfigFile}`);
            }
            // no config
            return;
        }

        // first one, high priority
        const configPath = existsList[0];
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

module.exports = MCR;
