#!/usr/bin/env node

const path = require('path');
const { pathToFileURL } = require('url');
const EC = require('eight-colors');

const { program } = require('commander');
const { foregroundChild } = require('foreground-child');

const MCR = require('./index.js');
const Util = require('./utils/util.js');

const version = require('../package.json').version;

// quote NODE_OPTIONS argument if it contains whitespace so child processes
// inheriting the env var can parse it correctly
const quoteNodeOption = (v) => ((/\s/).test(v) ? `"${v}"` : v);

// absolute path so NODE_OPTIONS keeps resolving when child processes are
// spawned with a different cwd than the mcr parent process
const getRequirePath = () => {
    return quoteNodeOption(path.resolve(__dirname, 'register', 'register.js'));
};

const getImportPath = () => {
    return quoteNodeOption(pathToFileURL(path.resolve(__dirname, 'register', 'register.mjs')).href);
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

const loadEnv = (cliOptions) => {
    if (!cliOptions.env) {
        return;
    }
    const envFile = cliOptions.env === true ? '.env' : cliOptions.env;
    process.loadEnvFile(envFile);
};

const initNodeOptions = async (cliOptions) => {

    loadEnv(cliOptions);

    const nodeOptions = await getInitNodeOptions(cliOptions);
    // console.log(nodeOptions);

    const preloadType = getPreloadType(nodeOptions);

    // export source after
    if (preloadType === '--import') {
        const importPath = getImportPath();
        nodeOptions.unshift(`--import ${importPath}`);
    } else {
        const requirePath = getRequirePath();
        nodeOptions.unshift(`--require ${requirePath}`);
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

// Only check whether targets were supplied. Node owns all target parsing,
// discovery and validation; preserve each argument exactly as provided.
const getTestTargets = (test) => {
    if (!test || (Array.isArray(test) && !test.length)) {
        Util.logInfo('No test targets configured; skipping tests.');
        return;
    }

    return Array.isArray(test) ? test : [test];
};

// Preserve signals and failing tests even if a hook sets exitCode=0.
const getTestExitStatus = (code, signal) => signal || code || process.exitCode || 0;

const executeCommand = async (command, cliOptions, testArgs = []) => {

    Util.logInfo(`Execute: ${EC.cyan(command)}`);

    if (command === 'merge') {
        return mergeCoverage(cliOptions);
    }

    // before load config
    await initNodeOptions(cliOptions);

    // console.log(options);
    const coverageReport = MCR(cliOptions);
    const isTest = command === 'test';
    await coverageReport.loadConfig(cliOptions.config);

    const coverageOptions = coverageReport.options;
    let childArgs;
    if (isTest) {
        const targets = getTestTargets(coverageOptions.test);
        if (!targets) {
            return;
        }
        childArgs = ['--test', ... testArgs, ... targets];
    }
    coverageReport.cleanCache();
    const nodeV8CoverageDir = initNodeV8CoverageDir(coverageOptions);
    if (isTest) {
        // Tests may spawn children with a different working directory.
        process.env.NODE_V8_COVERAGE = path.resolve(nodeV8CoverageDir);
    }

    // =========================================
    // onStart hook
    const onStart = coverageOptions.onStart;
    if (typeof onStart === 'function') {
        await onStart(coverageReport);
    }
    // =========================================

    const onClose = async (code, signal) => {

        // generate coverage even it is failed. code != 0

        try {
            // onReady hook before adding coverage data. Some children need
            // additional time to finish writing their coverage files.
            const onReady = coverageOptions.onReady;
            if (typeof onReady === 'function') {
                await onReady(coverageReport, nodeV8CoverageDir, subprocess);
            }

            await coverageReport.addFromDir(nodeV8CoverageDir);
            const report = await coverageReport.generate();
            if (isTest && !report) {
                throw new Error('No coverage report was generated');
            }
        } catch (error) {
            Util.logError(`Coverage report generation failed: ${error.message}`);
            process.exitCode = 1;
        } finally {
            if (!Util.isDebug()) {
                Util.rmSync(nodeV8CoverageDir);
            }
        }

        if (isTest) {
            return getTestExitStatus(code, signal);
        }
        return process.exitCode;
    };

    const subprocess = isTest ? foregroundChild(process.execPath, childArgs, {
        shell: false
    }, onClose) : foregroundChild(command, {
        shell: true
    }, onClose);

};

process.on('uncaughtException', function(err) {
    Util.logError(`Process uncaughtException: ${err.message}`);
    console.log(err.stack);
    process.exit(1);
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

// Also recognize `mcr -c config -- test targets -- runner-options` without
// falling through to the shell's unrelated `test` command. Only MCR options
// before the first separator are parsed in that form.
const getTestCommand = (args, subArgs) => {
    if (args[0] === 'test') {
        return {
            targets: args.slice(1), runnerArgs: subArgs.slice(1)
        };
    }
    if (args.length || subArgs[1] !== 'test') {
        return;
    }
    const remaining = subArgs.slice(2);
    const index = remaining.indexOf('--');
    if (index === -1) {
        return {
            targets: remaining, runnerArgs: []
        };
    }
    return {
        targets: remaining.slice(0, index), runnerArgs: remaining.slice(index + 1)
    };
};

program
    .name('mcr')
    .description('CLI to generate coverage reports')
    .version(version, '-v, --version', 'output the current version')
    .argument('[command]', 'command to execute, or built-in merge/test')
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
    .option('--outputFilter <pattern>', 'final source path filter')
    .option('--filter <pattern>', 'the combined filter')

    .option('--outputFile <path>', 'output file for v8 report')
    .option('--inline', 'inline html for v8 report')
    .option('--assetsPath <path>', 'assets path if not inline')

    .option('--lcov', 'generate lcov.info file')

    .option('--import <module>', 'preload module at startup')
    .option('--require <module>', 'preload module at startup')

    .option('--env [path]', 'env file (default: ".env")')

    .action((_command, cliOptions) => {
        const testCommand = getTestCommand(program.args, subArgv);
        if (testCommand) {
            // Commander has already removed MCR options and their values.
            // Positional targets override config; only args after -- are
            // forwarded unchanged to the Node runner.
            const { targets, runnerArgs } = testCommand;
            if (targets.length) {
                cliOptions.test = targets;
            }
            executeCommand('test', cliOptions, runnerArgs).catch((error) => {
                Util.logError(error.message);
                process.exitCode = 1;
            });
            return;
        }

        const args = [].concat(program.args).concat(subArgv);
        if (args[0] === '--') {
            args.shift();
        }
        const command = args.join(' ').trim();
        if (!command) {
            program.outputHelp();
            return;
        }

        executeCommand(command, cliOptions).catch((error) => {
            Util.logError(error.message);
            process.exitCode = 1;
        });
    });

program.parse(argv);
