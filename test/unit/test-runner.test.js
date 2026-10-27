import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getTestCommand, createTestRunner } from '../../lib/test/test-runner.js';
import { writeTestResults } from './test-results-utils.js';

const getReportPath = (args) => args.find((arg) => arg.startsWith('--test-reporter-destination=') && !arg.endsWith('=stdout')).slice('--test-reporter-destination='.length);

describe('Node test runner orchestration', () => {
    let root;
    let cacheDir;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-runner-cache-'));
        cacheDir = path.join(root, 'reports', '.cache');
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    it('recognizes test commands without consuming ordinary commands', () => {
        assert.deepEqual(getTestCommand(['test', 'test file.js'], ['--', '--test-reporter=tap']), {
            targets: ['test file.js'], runnerArgs: ['--test-reporter=tap']
        });
        assert.deepEqual(getTestCommand([], ['--', 'test', 'test file.js', '--', '--test-reporter=tap']), {
            targets: ['test file.js'], runnerArgs: ['--test-reporter=tap']
        });
        assert.deepEqual(getTestCommand([], ['--', 'test', 'test file.js']), {
            targets: ['test file.js'], runnerArgs: []
        });
        assert.equal(typeof getTestCommand(['node'], ['--', 'test']), 'undefined');
        assert.equal(typeof getTestCommand([], ['--', 'node', 'test']), 'undefined');
    });

    it('owns test arguments, result delivery and cleanup while using the shared executor', async () => {
        const events = [];
        const options = {
            test: ['file with spaces.js', '**/*.test.js'],
            cacheDir
        };
        const runner = createTestRunner(options, ['--test-reporter=tap']);
        // onStart can configure the hook after target selection.
        options.onTestEnd = async (results) => {
            await Promise.resolve();
            assert.equal(results.complete, true);
            events.push('testEnd');
        };
        let reportPath;
        await runner.execute(async (command, args, onClose) => {
            assert.equal(command, process.execPath);
            assert.deepEqual(args.slice(0, 2), ['--test', '--test-reporter=tap']);
            assert.deepEqual(args.slice(-2), options.test);
            reportPath = getReportPath(args);
            assert.equal(path.dirname(reportPath), cacheDir);
            writeTestResults(args);
            events.push('execute');
            await onClose();
        }, () => runner.onClose(async () => {
            await Promise.resolve();
            events.push('coverage');
            assert.equal(fs.existsSync(reportPath), false);
            assert.ok(fs.existsSync(reportPath.slice(0, -4)));
            // Successful coverage generation removes the whole cache first.
            fs.rmSync(cacheDir, {
                recursive: true, force: true
            });
            return {};
        }));
        assert.deepEqual(events, ['execute', 'testEnd', 'coverage']);
        assert.equal(fs.existsSync(path.dirname(reportPath)), false);
    });

    it('collects and publishes results when onTestEnd is omitted', async () => {
        const runner = createTestRunner({
            test: 'test.js', cacheDir
        });
        let reportPath;
        await runner.execute(async (_command, args, onClose) => {
            reportPath = getReportPath(args);
            writeTestResults(args);
            await onClose();
        }, () => runner.onClose(async () => {
            await Promise.resolve();
            assert.equal(fs.existsSync(reportPath), false);
            const results = JSON.parse(fs.readFileSync(reportPath.slice(0, -4), 'utf8'));
            assert.match(results.id, /^[a-z0-9]{20}$/);
            assert.equal(results.complete, true);
            return {};
        }));
    });

    it('keeps internal reporter options before -- and leaves following arguments untouched', async () => {
        const runner = createTestRunner({
            test: 'test.js', cacheDir
        }, ['--test_reporter=tap', '--', '--test-reporter=target.test.cjs']);
        await runner.execute(async (_command, args) => {
            await Promise.resolve();
            const separator = args.indexOf('--');
            assert.equal(args[1], '--test_reporter=tap');
            assert.deepEqual(args.slice(separator + 1), ['--test-reporter=target.test.cjs', 'test.js']);
            const internalReporters = args.slice(0, separator).filter((arg) => arg.startsWith('--test-reporter='));
            assert.equal(internalReporters.length, 1);
            assert.ok(internalReporters[0].includes('/test-reporter.js'));
            assert.ok(args.indexOf(`--test-reporter-destination=${getReportPath(args)}`) < separator);
        });
    });

    it('removes its temporary report even when the shared executor rejects', async () => {
        const runner = createTestRunner({
            test: 'test.js', cacheDir, onTestEnd: () => {}
        });
        let reportPath;
        await assert.rejects(runner.execute(async (_command, args) => {
            await Promise.resolve();
            reportPath = getReportPath(args);
            throw new Error('executor failed');
        }), /executor failed/);
        assert.equal(fs.existsSync(reportPath), false);
        assert.equal(fs.existsSync(cacheDir), true);
    });

    it('rejects missing coverage without requiring a test result hook', async () => {
        const runner = createTestRunner({
            test: 'test.js'
        });
        await assert.rejects(runner.onClose(async () => {
            await Promise.resolve();
        }), /No coverage report was generated/);
    });
});
