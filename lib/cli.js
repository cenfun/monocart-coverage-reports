#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');

const {
    foregroundChild,
    program
} = require('./packages/monocart-coverage-vendor.js');

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

const isFeatureSupported = (nv) => {
    // module register added in Node.js: v20.6.0
    const [major, minor] = nv.split('.').map((s) => parseInt(s));
    if (major < 20) {
        return false;
    }
    if (major > 20) {
        return true;
    }
    if (minor < 6) {
        return false;
    }
    return true;
};

const initNodeOptions = async (cliOptions) => {
    const nv = process.versions.node;
    if (!isFeatureSupported(nv)) {
        Util.logInfo(EC.yellow(`The current Node.js version "${nv}" does NOT support "module.register", it requires "20.6.0" or higher.`));
        return;
    }

    const nodeOptions = [];
    if (process.env.NODE_OPTIONS) {
        nodeOptions.push(process.env.NODE_OPTIONS);
    }

    if (cliOptions.import) {
        nodeOptions.push('--import');
        nodeOptions.push(cliOptions.import);
        await import(cliOptions.import);
    } else if (cliOptions.require) {
        nodeOptions.push('--require');
        nodeOptions.push(cliOptions.require);
        await import(cliOptions.require);
    }

    // console.log(nodeOptions);

    // export source after
    const hasImport = nodeOptions.find((it) => typeof it === 'string' && it.includes('--import'));
    if (hasImport) {
        const importPath = getRegisterPath('register.mjs');
        const hasImportPath = nodeOptions.find((it) => typeof it === 'string' && it.includes(importPath));
        if (!hasImportPath) {
            nodeOptions.push('--import');
            nodeOptions.push(importPath);
        }
    } else {
        const requirePath = getRegisterPath('register.js');
        const hasRequirePath = nodeOptions.find((it) => typeof it === 'string' && it.includes(requirePath));
        if (!hasRequirePath) {
            nodeOptions.push('--require');
            nodeOptions.push(requirePath);
        }
    }

    // console.log(nodeOptions);

    process.env.NODE_OPTIONS = nodeOptions.join(' ');

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

const executeCommand = async (command, cliOptions) => {

    Util.logInfo(`Execute: ${EC.cyan(command)}`);

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

        if (!fs.existsSync(nodeV8CoverageDir)) {
            EC.logRed(`Invalid V8 coverage dir: ${Util.relativePath(nodeV8CoverageDir)}`);
            return 1;
        }

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
    Util.logError(`Process uncaughtException: ${err.message || err}`);
});

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

    .option('--import <module>', 'preload module at startup')
    .option('--require <module>', 'preload module at startup')

    .action((_command, cliOptions) => {
        const command = program.args.join(' ');
        executeCommand(command, cliOptions);
    });

program.parse();
