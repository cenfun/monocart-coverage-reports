#!/usr/bin/env node

import path from 'node:path';
import { constants } from 'node:os';
import { pathToFileURL } from 'node:url';
import EC from 'eight-colors';

import { program } from 'commander';
import { execa } from 'execa';

import { MCR } from './index.js';
import { Util } from './utils/util.js';
import pkg from '../package.json' with { type: 'json' };

const version = pkg.version;

// quote NODE_OPTIONS argument if it contains whitespace so child processes
// inheriting the env var can parse it correctly
const quoteNodeOption = (v) => ((/[\s"\\]/).test(v) ? JSON.stringify(v) : v);

// absolute path so NODE_OPTIONS keeps resolving when child processes are
// spawned with a different cwd than the mcr parent process
const getImportPath = () => {
    return quoteNodeOption(pathToFileURL(path.resolve(import.meta.dirname, 'register', 'register.js')).href);
};

const getInitNodeOptions = async (cliOptions) => {
    const nodeOptions = [];
    if (process.env.NODE_OPTIONS) {
        nodeOptions.push(process.env.NODE_OPTIONS);
    }

    const name = cliOptions.import || cliOptions.require;
    if (name) {
        const specifier = path.isAbsolute(name) || name.startsWith('.') ? pathToFileURL(path.resolve(name)).href : import.meta.resolve(name);
        nodeOptions.push(`--import ${quoteNodeOption(specifier)}`);
        // Load before mcr.config.ts. CJS interoperability is handled by Node.
        await import(specifier);
    }

    return nodeOptions;
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

    // Register source capture before other ESM preloads.
    nodeOptions.unshift(`--import ${getImportPath()}`);

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

// Preserve signals and failing commands even if a hook sets exitCode=0.
const getExitStatus = (code, signal) => signal || code || process.exitCode || 0;

const applyExitStatus = (status) => {
    if (typeof status === 'number') {
        process.exitCode = status;
        return;
    }
    process.exitCode = 128 + (constants.signals[status] || 1);
    if (process.platform !== 'win32') {
        // Stay alive until the signal is delivered, after coverage has flushed.
        const timer = setTimeout(() => {}, 2000);
        try {
            process.kill(process.pid, status);
        } catch {
            clearTimeout(timer);
        }
    }
};

const proxySignals = (execution) => {
    const state = {
        finished: false, signal: null
    };
    const listeners = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((signal) => {
        const listener = () => {
            state.signal ||= signal;
            if (!state.finished) {
                execution.kill(signal);
            }
        };
        process.on(signal, listener);
        return [signal, listener];
    });
    state.dispose = () => {
        for (const [signal, listener] of listeners) {
            process.removeListener(signal, listener);
        }
    };
    return state;
};

const logSpawnFailure = (result) => {
    if (result.failed && !Number.isInteger(result.exitCode) && !result.signal) {
        Util.logError(result.shortMessage || result.message);
    }
};

const executeSubprocess = async (command, args, onClose) => {
    const execution = execa(command, args, {
        stdio: 'inherit',
        reject: false
    });
    const signals = proxySignals(execution);
    let status;
    try {
        const result = await execution;
        signals.finished = true;
        logSpawnFailure(result);
        // Preserve the native ChildProcess API exposed to onReady hooks.
        status = await onClose(result.exitCode ?? (result.failed ? 1 : 0), result.signal || signals.signal, execution.nodeChildProcess);
        status = signals.signal || status;
    } finally {
        signals.dispose();
    }
    applyExitStatus(status);
};

const executeCommand = async ([command, ... commandArgs], cliOptions, testArgs = []) => {

    Util.logInfo(`Execute: ${EC.cyan([command, ... commandArgs].join(' '))}`);

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

    const onClose = async (code, signal, subprocess) => {

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

        return getExitStatus(code, signal);
    };

    if (isTest) {
        return executeSubprocess(process.execPath, childArgs, onClose);
    }
    return executeSubprocess(command, commandArgs, onClose);

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
    .option('--require <module>', 'deprecated alias for --import (ESM resolution)')

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
            executeCommand(['test'], cliOptions, runnerArgs).catch((error) => {
                Util.logError(error.message);
                process.exitCode = 1;
            });
            return;
        }

        const args = [].concat(program.args).concat(subArgv);
        if (args[0] === '--') {
            args.shift();
        }
        if (!args.length || !args[0]) {
            program.outputHelp();
            return;
        }

        executeCommand(args, cliOptions).catch((error) => {
            Util.logError(error.message);
            process.exitCode = 1;
        });
    });

program.parse(argv);
