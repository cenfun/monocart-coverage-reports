import fs from 'node:fs';
import { Util } from '../utils/util.js';

// Only tokenize NODE_OPTIONS to count option names, keeping quoted values
// together. The original options and values are passed to Node untouched.
const splitNodeOptions = (value) => {
    const tokens = value.match(/(?:[^\s"]|"(?:\\.|[^"\\])*")+/g) || [];
    return tokens.map((token) => token.replaceAll('"', ''));
};

const getRunnerOptions = (args) => {
    const index = args.indexOf('--');
    return index === -1 ? args : args.slice(0, index);
};

// Node treats underscores and hyphens as equivalent in option names. Inspect
// only names here; the original arguments and their values remain untouched.
const countOption = (args, name) => args.filter((arg) => arg.split('=', 1)[0].replaceAll('_', '-') === name).length;

const getReporterArgs = (args) => {
    const reporters = countOption(args, '--test-reporter');
    const destinations = countOption(args, '--test-reporter-destination');
    // Preserve Node's validation instead of accidentally fixing an invalid pair.
    if ((reporters > 1 || destinations > 0) && reporters !== destinations) {
        throw new Error('The number of --test-reporter options must match --test-reporter-destination options');
    }
    const extraArgs = [];
    if (!reporters) {
        // Node 22 defaults to TAP when stdout is not a TTY; Node 23+ uses spec.
        const reporter = Number(process.versions.node.split('.')[0]) < 23 && !process.stdout.isTTY ? 'tap' : 'spec';
        extraArgs.push(`--test-reporter=${reporter}`);
    }
    if (!destinations) {
        extraArgs.push('--test-reporter-destination=stdout');
    }
    return extraArgs;
};

const readMetadata = (metadataPath, resultsPath, id) => {
    // This is an internal completion record, not an external report input.
    // Keep the no-hook path bounded even if an interrupted file is malformed.
    if (fs.statSync(metadataPath).size > 1024) {
        throw new Error('Invalid Node test report metadata');
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (metadata?.id !== id || typeof metadata.complete !== 'boolean' || !Number.isSafeInteger(metadata.byteLength) || metadata.byteLength <= 0) {
        throw new Error('Invalid Node test report metadata');
    }
    if (metadata.byteLength !== fs.statSync(resultsPath).size) {
        throw new Error('Incomplete Node test report output');
    }
    return metadata;
};

const validateResults = (results, id) => {
    if (results?.id !== id || results.framework !== 'node:test' || typeof results.complete !== 'boolean' || !Array.isArray(results.tests)) {
        throw new Error('Invalid Node test report');
    }
};

const createTestResultsCollector = (runnerArgs, cacheDir) => {
    const args = [... splitNodeOptions(process.env.NODE_OPTIONS || ''), ... getRunnerOptions(runnerArgs)];
    const extraArgs = getReporterArgs(args);
    fs.mkdirSync(cacheDir, {
        recursive: true
    });
    const id = Util.uid();
    const { cachePath } = Util.getCacheFileInfo('test-results', id, cacheDir);
    const resultsPath = `${cachePath}.tmp`;
    const metadataPath = `${cachePath}.meta.tmp`;
    const reporterURL = new URL('./test-reporter.js', import.meta.url);
    reporterURL.searchParams.set('id', id);
    reporterURL.searchParams.set('meta', metadataPath);
    extraArgs.push(`--test-reporter=${reporterURL.href}`, `--test-reporter-destination=${resultsPath}`);
    return {
        args: extraArgs,
        readMetadata: () => readMetadata(metadataPath, resultsPath, id),
        read: () => {
            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            validateResults(results, id);
            return results;
        },
        publish: (results) => {
            readMetadata(metadataPath, resultsPath, id);
            if (results) {
                validateResults(results, id);
                // onTestEnd can redact messages/names before raw/debug export.
                // Only configured hooks require a full read and rewrite.
                fs.writeFileSync(resultsPath, JSON.stringify(results));
            }
            fs.renameSync(resultsPath, cachePath);
        },
        dispose: () => {
            fs.rmSync(resultsPath, {
                force: true
            });
            fs.rmSync(metadataPath, {
                force: true
            });
        }
    };
};

export { createTestResultsCollector, getRunnerOptions };
