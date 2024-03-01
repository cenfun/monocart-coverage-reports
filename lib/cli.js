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

const cleanDir = (dir) => {
    Util.rmSync(dir);
};

const resolveConfigPath = (customConfigPath) => {

    const configList = [
        '.mcrrc',
        'mcr.config.json',
        'mcr.config.mjs',
        'mcr.config.cjs',
        'mcr.config.js'
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

    if (!configOptions) {
        Util.logError(`ERROR: failed to import "${configPath}" ${err.message} `);
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
        ... defaultOptions
    };
    Object.keys(cliOptions).forEach((k) => {
        if (Util.hasOwn(options, k)) {
            options[k] = cliOptions[k];
        }
    });

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

    // TODO nodejs should return real source in source map cache


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

const collectCoverageData = (coverageList, entryFilterHandler, sourceMapCache = {}) => {

    if (!Util.isList(coverageList)) {
        return;
    }

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));
    coverageList = coverageList.filter(entryFilterHandler);

    if (!Util.isList(coverageList)) {
        return;
    }

    for (const entry of coverageList) {
        resolveEntrySource(entry, sourceMapCache);
        resolveEntrySourceMap(entry, sourceMapCache);
    }

    return coverageList;
};

const executeCommand = async (command, cliOptions) => {

    const options = await initOptions(cliOptions);

    Util.logInfo(`Execute: ${EC.cyan(command)}`);
    // console.log(options);

    const nodeV8CoverageDir = path.resolve(options.outputDir, '.v8-coverage');
    process.env.NODE_V8_COVERAGE = nodeV8CoverageDir;

    cleanDir(nodeV8CoverageDir);

    // console.log('nodeV8CoverageDir', nodeV8CoverageDir);

    const coverageReport = MCR(options);
    coverageReport.cleanCache();

    // on start hook
    const onStart = cliOptions.onStart;
    if (typeof onStart === 'function') {
        await onStart(coverageReport);
    }

    foregroundChild(command, {
        shell: true
    }, async () => {

        if (!fs.existsSync(nodeV8CoverageDir)) {
            EC.logRed(`Not found coverage data: ${Util.relativePath(nodeV8CoverageDir)}`);
            return 1;
        }

        const entryFilterHandler = coverageReport.getEntryFilter();

        const files = fs.readdirSync(nodeV8CoverageDir);
        for (const filename of files) {
            const content = fs.readFileSync(path.resolve(nodeV8CoverageDir, filename)).toString('utf-8');
            const json = JSON.parse(content);
            const coverageList = json.result;
            const sourceMapCache = json['source-map-cache'];
            const coverageData = await collectCoverageData(coverageList, entryFilterHandler, sourceMapCache);
            if (coverageData) {
                await coverageReport.add(coverageData);
            }
        }

        await coverageReport.generate();

        // remove nodeV8CoverageDir
        if (options.logging !== 'debug') {
            cleanDir(nodeV8CoverageDir);
        }

        return process.exitCode;
    });

};

program
    .name('mcr')
    .description('CLI to generate coverage reports')
    .version(version)
    .argument('<command>', 'command to execute')
    .option('-c, --config <path>', 'custom config path')
    .option('-o, --outputDir <dir>', 'output dir for reports')
    .option('-r, --reports <name[,name]>', 'coverage reports to use')
    .option('-n, --name <name>', 'report name for title')
    .option('-i, --inputDir <dir>', 'input dir for merging raw files')

    .option('--entryFilter <pattern>', 'entry url filter')
    .option('--sourceFilter <pattern>', 'source path filter')

    .option('--outputFile <path>', 'output file for v8 report')
    .option('--inline', 'inline html for v8 report')
    .option('--assetsPath <path>', 'assets path if not inline')

    .option('--lcov', 'generate lcov.info file')

    .option('--logging <logging>', 'off, error, info, debug')

    .action((command, cliOptions) => {
        executeCommand(command, cliOptions);
    });

program.parse();
