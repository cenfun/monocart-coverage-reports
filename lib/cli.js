#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const { fileURLToPath, pathToFileURL } = require('url');

const {
    foregroundChild,
    program
} = require('./packages/monocart-coverage-vendor.js');

const MCR = require('./index.js');
const Util = require('./utils/util.js');
const defaultOptions = require('./default/options.js');
const { resolveSourceMap } = require('./converter/collect-source-maps.js');

const version = require('../package.json').version;

const resolveConfigPath = (customConfigPath) => {

    const configList = [
        '.mcrrc',
        'mcr.config.json',
        'mcr.config.mjs',
        'mcr.config.cjs',
        'mcr.config.js',
        'mcr.config.ts'
    ];

    if (customConfigPath) {
        configList.push(customConfigPath);
    }

    const existsList = configList.filter((p) => fs.existsSync(p));
    if (!existsList.length) {
        return;
    }

    // last one
    const configPath = existsList.pop();
    Util.logInfo(`Config: ${EC.cyan(configPath)}`);

    return configPath;
};

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

    if (err || !configOptions) {
        Util.logError(`ERROR: failed to import "${configPath}": ${err && err.message} `);
        return;
    }

    configOptions = configOptions.default || configOptions;

    return configOptions;
};

const initOptions = async (cliOptions) => {

    const configPath = resolveConfigPath(cliOptions.config);
    if (configPath) {
        const configOptions = await resolveConfigOptions(configPath);
        if (configOptions) {
            cliOptions = {
                ... configOptions,
                ... cliOptions
            };
        }
    }

    // report options
    const options = {
        ... defaultOptions,
        ... cliOptions
    };

    return options;
};

const resolveEntrySource = (entry, sourceMapCache = {}) => {
    let source;
    const filePath = fileURLToPath(entry.url);
    const extname = path.extname(filePath);
    if (fs.existsSync(filePath)) {
        source = fs.readFileSync(filePath).toString('utf8');
    }

    // not for typescript
    if (source && !['.ts', '.tsx'].includes(extname)) {
        entry.source = source;
        return;
    }

    const sourcemapData = sourceMapCache[entry.url];
    const lineLengths = sourcemapData && sourcemapData.lineLengths;

    // for fake source file (can not parse to AST)
    if (lineLengths) {
        // get runtime code with ts-node
        let fakeSource = '';
        sourcemapData.lineLengths.forEach((length) => {
            fakeSource += `${''.padEnd(length, '*')}\n`;
        });
        entry.fake = true;
        entry.source = fakeSource;
    }

    // Note: no runtime code in source map cache
    // This is a problem for typescript

};

const resolveEntrySourceMap = (entry, sourceMapCache = {}) => {
    // sourcemap data
    const sourcemapData = sourceMapCache[entry.url];
    if (sourcemapData) {
        if (sourcemapData.data) {
            entry.sourceMap = resolveSourceMap(sourcemapData.data, entry.url);
        }
    }
};

const collectCoverageData = (coverageList, entryFilter, sourceMapCache = {}) => {

    if (!Util.isList(coverageList)) {
        return;
    }

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));
    coverageList = coverageList.filter(entryFilter);

    if (!Util.isList(coverageList)) {
        return;
    }

    for (const entry of coverageList) {
        resolveEntrySource(entry, sourceMapCache);
        resolveEntrySourceMap(entry, sourceMapCache);
    }

    return coverageList;
};

const addCoverageData = async (coverageReport, nodeV8CoverageDir) => {

    let added = false;

    const files = fs.readdirSync(nodeV8CoverageDir);
    if (!files.length) {
        return added;
    }

    // filter before adding
    const entryFilter = coverageReport.getEntryFilter();
    for (const filename of files) {
        const filePath = path.resolve(nodeV8CoverageDir, filename);
        const content = fs.readFileSync(filePath).toString('utf-8');
        if (content) {
            const json = JSON.parse(content);
            const coverageList = json.result;
            const sourceMapCache = json['source-map-cache'];
            const coverageData = collectCoverageData(coverageList, entryFilter, sourceMapCache);
            if (coverageData) {
                await coverageReport.add(coverageData);
                added = true;
            }
        }
    }

    return added;
};

const executeCommand = async (command, cliOptions) => {

    const options = await initOptions(cliOptions);

    Util.logInfo(`Execute: ${EC.cyan(command)}`);
    // console.log(options);

    const nodeV8CoverageDir = path.resolve(options.outputDir, '.v8-coverage');
    process.env.NODE_V8_COVERAGE = nodeV8CoverageDir;

    // clean v8 cache before running
    Util.rmSync(nodeV8CoverageDir);

    // console.log('nodeV8CoverageDir', nodeV8CoverageDir);

    const coverageReport = MCR(options);
    coverageReport.cleanCache();

    // =========================================
    // onStart hook
    const onStart = options.onStart;
    if (typeof onStart === 'function') {
        await onStart(coverageReport);
    }
    // =========================================

    const subprocess = foregroundChild(command, {
        shell: true
    }, async () => {

        if (!fs.existsSync(nodeV8CoverageDir)) {
            EC.logRed(`Not found coverage data: ${Util.relativePath(nodeV8CoverageDir)}`);
            return 1;
        }

        // =========================================
        // onReady hook before adding coverage data.
        // Sometimes, the child process has not yet finished writing the coverage data, and it needs to wait here.
        const onReady = options.onReady;
        if (typeof onReady === 'function') {
            await onReady(coverageReport, nodeV8CoverageDir, subprocess);
        }
        // =========================================

        await addCoverageData(coverageReport, nodeV8CoverageDir);
        await coverageReport.generate();

        // remove nodeV8CoverageDir
        if (!Util.isDebug()) {
            Util.rmSync(nodeV8CoverageDir);
        }

        return process.exitCode;
    });

};

program
    .name('mcr')
    .description('CLI to generate coverage reports')
    .version(version)
    .argument('<command>', 'command to execute')
    .allowUnknownOption()
    .option('-c, --config <path>', 'custom config file path')
    .option('--logging <logging>', 'off, error, info, debug')

    .option('-n, --name <name>', 'report name for title')
    .option('-r, --reports <name[,name]>', 'coverage reports to use')

    .option('-o, --outputDir <dir>', 'output dir for reports')
    .option('-i, --inputDir <dir>', 'input dir for merging raw files')

    .option('--entryFilter <pattern>', 'entry url filter')
    .option('--sourceFilter <pattern>', 'source path filter')

    .option('--outputFile <path>', 'output file for v8 report')
    .option('--inline', 'inline html for v8 report')
    .option('--assetsPath <path>', 'assets path if not inline')

    .option('--lcov', 'generate lcov.info file')

    .action((_command, cliOptions) => {
        const command = program.args.join(' ');
        executeCommand(command, cliOptions);
    });

program.parse();
