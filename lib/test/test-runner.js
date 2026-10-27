import path from 'node:path';
import { Util } from '../utils/util.js';
import { createTestResultsCollector, getRunnerOptions } from './test-results.js';

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

// Node owns target parsing, discovery and validation. Preserve each argument.
const getTestTargets = (test) => {
    if (!test || (Array.isArray(test) && !test.length)) {
        Util.logInfo('No test targets configured; skipping tests.');
        return;
    }
    return Array.isArray(test) ? test : [test];
};

const initTestResultsCollector = (coverageOptions, runnerArgs, childArgs) => {
    // Read results before coverage generation, which may remove the cache.
    const testResultsCollector = createTestResultsCollector(runnerArgs, coverageOptions.cacheDir);
    // Internal options must stay before Node's end-of-options marker.
    childArgs.splice(1 + getRunnerOptions(runnerArgs).length, 0, ... testResultsCollector.args);
    return testResultsCollector;
};

const runTestEnd = async (testResultsCollector, onTestEnd) => {
    if (!testResultsCollector) {
        return 0;
    }
    try {
        const metadata = testResultsCollector.readMetadata();
        const failed = !metadata.complete;
        if (failed) {
            Util.logError('Node test report is incomplete');
        }
        let testResults;
        if (typeof onTestEnd === 'function') {
            testResults = testResultsCollector.read();
            await onTestEnd(testResults);
        }
        // Publish only after a successful hook, so redaction reaches raw/debug
        // artifacts. Never fall back to unredacted data if the hook throws.
        testResultsCollector.publish(testResults);
        return process.exitCode || (failed ? 1 : 0);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Util.logError(`Node test report collection or onTestEnd failed: ${message}`);
        return 1;
    } finally {
        // Do not export unfinished reporter output through coverage raw reports.
        testResultsCollector.dispose();
    }
};

const createTestRunner = (coverageOptions, runnerArgs = []) => {
    const targets = getTestTargets(coverageOptions.test);
    if (!targets) {
        return;
    }
    const childArgs = ['--test', ... runnerArgs, ... targets];
    let testResultsCollector;
    let onTestEnd;
    return {
        initCoverageDir: (nodeV8CoverageDir) => {
            // Tests may spawn children with a different working directory.
            process.env.NODE_V8_COVERAGE = path.resolve(nodeV8CoverageDir);
        },
        onClose: async (generateCoverage) => {
            const testExitCode = await runTestEnd(testResultsCollector, onTestEnd);
            try {
                const report = await generateCoverage();
                if (!report) {
                    throw new Error('No coverage report was generated');
                }
            } finally {
                // A later coverage hook must not mask a test hook/collection failure.
                if (testExitCode) {
                    process.exitCode = process.exitCode || testExitCode;
                }
            }
        },
        execute: async (executeSubprocess, onClose) => {
            // Always collect results; onStart may still configure the optional hook.
            onTestEnd = coverageOptions.onTestEnd;
            testResultsCollector = initTestResultsCollector(coverageOptions, runnerArgs, childArgs);
            try {
                return await executeSubprocess(process.execPath, childArgs, onClose);
            } finally {
                testResultsCollector?.dispose();
            }
        }
    };
};

export { getTestCommand, createTestRunner };
