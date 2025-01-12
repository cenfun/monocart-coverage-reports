#!/usr/bin/env node

const path = require('path');
const EC = require('eight-colors');

const { program } = require('commander');
const { foregroundChild } = require('foreground-child');

const MCR = require('./index.js');
const Util = require('./utils/util.js');

const version = require('../package.json').version;

const getRegisterPath = (filename) => {
    const rel = Util.relativePath(path.resolve(__dirname, 'register', filename));
    if (rel.startsWith('.')) {
        return rel;
    }
    return `./${rel}`;
};

const getInitNodeOptions = async (cliOptions) => {
    const nodeOptions = [];
    if (process.env.NODE_OPTIONS) {
        nodeOptions.push(process.env.NODE_OPTIONS);
    }

    if (cliOptions.import) {
        nodeOptions.push(`--import ${cliOptions.import}`);
        // for load mcr.config.ts
        await import(cliOptions.import);
    } else if (cliOptions.require) {
        nodeOptions.push(`--require ${cliOptions.require}`);
        // for load mcr.config.ts
        await import(cliOptions.require);
    }

    return nodeOptions;
};

const getPreloadType = (nodeOptions) => {
    const hasImport = nodeOptions.find((it) => it.includes('--import'));
    if (hasImport) {
        return '--import';
    }
    return '--require';
};

const checkRegisterFeature = () => {
    const nv = process.versions.node;

    // "module.register" added in Node.js: v20.6.0
    // if (Util.cmpVersion(nv, '20.6.0') >= 0) {
    //     return true;
    // }
    // but also added in: v18.19.0
    const requiredNV = '18.19.0';
    if (Util.cmpVersion(nv, requiredNV) < 0) {
        Util.logInfo(`The current Node.js version "${nv}" does NOT support "module.register", it requires "${requiredNV}" or higher.`);
        return false;
    }

    // could be < 20.6.0 but just ignore it, please using latest minor version

    return true;
};

const loadEnv = (cliOptions) => {
    if (!cliOptions.env) {
        return;
    }
    const envFile = cliOptions.env === true ? '.env' : cliOptions.env;
    const loadEnvFile = process.loadEnvFile;
    if (typeof loadEnvFile === 'function') {
        loadEnvFile(envFile);
    }
};

const initNodeOptions = async (cliOptions) => {

    loadEnv(cliOptions);

    const supportRegister = checkRegisterFeature();
    if (!supportRegister) {
        return;
    }

    const nodeOptions = await getInitNodeOptions(cliOptions);
    // console.log(nodeOptions);

    const preloadType = getPreloadType(nodeOptions);

    // export source after
    if (preloadType === '--import') {
        const importPath = getRegisterPath('register.mjs');
        nodeOptions.push(`--import ${importPath}`);
    } else {
        const requirePath = getRegisterPath('register.js');
        nodeOptions.push(`--require ${requirePath}`);
    }

    // console.log(nodeOptions);
    const nodeOptionsStr = nodeOptions.join(' ');
    Util.logDebug(`node options: ${EC.cyan(nodeOptionsStr)}`);

    process.env.NODE_OPTIONS = nodeOptionsStr;

};

const initNodeV8CoverageDir = (coverageOptions) => {
    // dir for node v8 coverage
    const nodeV8CoverageDir = Util.relativePath(path.resolve(coverageOptions.outputDir, '.v8-coverage'));
    process.env.NODE_V8_COVERAGE = nodeV8CoverageDir;
    // clean v8 cache before running
    Util.rmSync(nodeV8CoverageDir);
    // Util.logInfo(`V8 coverage dir: ${EC.cyan(nodeV8CoverageDir)}`);

    return nodeV8CoverageDir;
};

const mergeCoverage = async (cliOptions) => {
    const coverageReport = MCR(cliOptions);
    await coverageReport.loadConfig(cliOptions.config);
    coverageReport.cleanCache();
    await coverageReport.generate();
};

const executeCommand = async (command, cliOptions) => {

    Util.logInfo(`Execute: ${EC.cyan(command)}`);

    if (command === 'merge') {
        return mergeCoverage(cliOptions);
    }

    // before load config
    await initNodeOptions(cliOptions);

    // console.log(options);
    const coverageReport = MCR(cliOptions);
    await coverageReport.loadConfig(cliOptions.config);
    coverageReport.cleanCache();

    const coverageOptions = coverageReport.options;
    const nodeV8CoverageDir = initNodeV8CoverageDir(coverageOptions);

    // =========================================
    // onStart hook
    const onStart = coverageOptions.onStart;
    if (typeof onStart === 'function') {
        await onStart(coverageReport);
    }
    // =========================================

    const subprocess = foregroundChild(command, {
        shell: true
    }, async (code, signal) => {

        // generate coverage even it is failed. code != 0

        // =========================================
        // onReady hook before adding coverage data.
        // Sometimes, the child process has not yet finished writing the coverage data, and it needs to wait here.
        const onReady = coverageOptions.onReady;
        if (typeof onReady === 'function') {
            await onReady(coverageReport, nodeV8CoverageDir, subprocess);
        }
        // =========================================

        await coverageReport.addFromDir(nodeV8CoverageDir);
        await coverageReport.generate();

        // remove nodeV8CoverageDir
        if (!Util.isDebug()) {
            Util.rmSync(nodeV8CoverageDir);
        }

        return process.exitCode;
    });

};

process.on('uncaughtException', function(err) {
    Util.logError(`Process uncaughtException: ${err.message}`);
    console.log(err.stack);
});

// the -- separator
const argv = [];
const subArgv = [];
let separator = false;
process.argv.forEach((it) => {
    if (!separator && it === '--') {
        separator = true;
    }
    if (separator) {
        subArgv.push(it);
    } else {
        argv.push(it);
    }
});

program
    .name('mcr')
    .description('CLI to generate coverage reports')
    .version(version, '-v, --version', 'output the current version')
    .argument('[command]', 'command to execute')
    .allowUnknownOption()
    .allowExcessArguments()
    .option('-c, --config <path>', 'custom config file path')
    .option('-l, --logging <logging>', 'off, error, info, debug')

    .option('-n, --name <name>', 'report name for title')
    .option('-r, --reports <name[,name]>', 'coverage reports to use')

    .option('-o, --outputDir <dir>', 'output dir for reports')
    .option('-i, --inputDir <dir>', 'input dir for merging raw files')
    .option('-b, --baseDir <dir>', 'base dir for normalizing path')

    .option('-a, --all <dir>', 'include all files from dir')

    .option('--entryFilter <pattern>', 'entry url filter')
    .option('--sourceFilter <pattern>', 'source path filter')
    .option('--filter <pattern>', 'the combined filter')

    .option('--outputFile <path>', 'output file for v8 report')
    .option('--inline', 'inline html for v8 report')
    .option('--assetsPath <path>', 'assets path if not inline')

    .option('--lcov', 'generate lcov.info file')

    .option('--import <module>', 'preload module at startup')
    .option('--require <module>', 'preload module at startup')

    .option('--env [path]', 'env file (default: ".env")')

    .action((_command, cliOptions) => {
        const args = [].concat(program.args).concat(subArgv);
        if (args[0] === '--') {
            args.shift();
        }
        const command = args.join(' ').trim();
        if (!command) {
            program.outputHelp();
            return;
        }

        executeCommand(command, cliOptions);
    });

program.parse(argv);
