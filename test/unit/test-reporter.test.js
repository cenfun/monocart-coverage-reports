import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline, finished } from 'node:stream/promises';
import TestReporter from '../../lib/test/test-reporter.js';
import { createTestResultsCollector } from '../../lib/test/test-results.js';
import { getTestResultsFiles, writeTestResults } from './test-results-utils.js';

const collect = async (events) => {
    let json = '';
    const output = new Writable({
        write: (chunk, _encoding, callback) => {
            json += chunk;
            callback();
        }
    });
    await pipeline(Readable.from(events), new TestReporter('unit-id'), output);
    return JSON.parse(json);
};

const completedTest = (error, extra = {}) => ({
    type: error ? 'test:fail' : 'test:pass',
    data: {
        name: 'case',
        nesting: 0,
        testNumber: 1,
        details: {
            duration_ms: 10, type: 'test', error
        },
        ... extra
    }
});

const summary = (file) => ({
    type: 'test:summary',
    data: {
        file,
        success: true,
        duration_ms: 20,
        counts: {
            tests: 1, suites: 0, passed: 1, failed: 0, skipped: 0, todo: 0, cancelled: 0
        }
    }
});

describe('Node test JSON reporter', () => {
    it('flushes empty input and keeps results isolated between instances', async () => {
        const first = await collect([completedTest(), summary()]);
        const empty = await collect([]);
        assert.equal(first.tests.length, 1);
        assert.equal(first.complete, true);
        assert.deepEqual(empty, {
            id: 'unit-id', framework: 'node:test', complete: false, summary: null, tests: []
        });
    });

    it('streams records before the input ends', async () => {
        const reporter = new TestReporter('stream-id');
        let output = '';
        reporter.on('data', (chunk) => {
            output += chunk;
        });
        await new Promise((resolve, reject) => {
            reporter.write(completedTest(), (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        assert.match(output, /"name":"case"/);
        assert.equal(output.includes('"summary"'), false);
        const done = finished(reporter);
        reporter.end(summary());
        await done;
        assert.equal(JSON.parse(output).tests.length, 1);
    });

    it('propagates event handling failures through the stream', async () => {
        await assert.rejects(collect([{
            type: 'test:summary', data: {}
        }]), TypeError);
    });

    it('uses fixed defaults without invoking core field getters or coercion hooks', async () => {
        const error = new Error('test failed');
        Object.defineProperty(error, 'message', {
            enumerable: true,
            get: () => {
                throw new Error('must not read message getter');
            }
        });
        error.name = {
            toString: () => {
                throw new Error('must not coerce name');
            }
        };
        const results = await collect([completedTest(error)]);
        assert.deepEqual(results.tests[0].error, {
            name: 'Error', message: ''
        });
    });

    it('requires the final runner summary, not a per-file summary', async () => {
        const incomplete = await collect([completedTest(), summary('test.js')]);
        assert.equal(incomplete.complete, false);
        assert.equal(incomplete.summary, null);
        assert.equal(incomplete.tests.length, 1);
        const complete = await collect([completedTest(), summary('test.js'), summary()]);
        assert.equal(complete.complete, true);
        assert.equal(complete.summary.tests, 1);
        assert.equal(complete.summary.passed, 1);
        assert.equal(complete.summary.duration, 20);
    });

    it('skips enumerable accessors without invoking their getters', async () => {
        const error = new Error('test failed');
        ['stack', 'cause', 'actual', 'expected', 'config'].forEach((key) => {
            Object.defineProperty(error, key, {
                enumerable: true,
                get: () => {
                    throw new Error(`must not read ${key}`);
                }
            });
        });
        const results = await collect([completedTest(error), summary()]);
        assert.deepEqual(results.tests[0].error, {
            name: 'Error', message: 'test failed'
        });
    });

    it('copies JSON-safe primitive fields and converts BigInt without traversing objects', async () => {
        const error = new TypeError('bad input');
        Object.assign(error, {
            code: 'ERR_INPUT',
            failureType: 'testCodeFailure',
            actual: 0,
            expected: 2,
            fraction: 1.5,
            retryable: false,
            empty: '',
            missing: null,
            bigint: 12345678901234567890n,
            nan: NaN,
            infinity: Infinity,
            negativeInfinity: -Infinity,
            context: {
                value: 1
            },
            array: [1, 2],
            date: new Date(),
            symbol: Symbol('private'),
            fn: () => {},
            toJSON: () => {
                throw new Error('must not invoke toJSON');
            }
        });
        Object.defineProperty(error, 'undefinedField', {
            enumerable: true
        });
        const results = await collect([completedTest(error)]);
        assert.deepEqual(results.tests[0].error, {
            name: 'TypeError',
            message: 'bad input',
            code: 'ERR_INPUT',
            failureType: 'testCodeFailure',
            actual: 0,
            expected: 2,
            fraction: 1.5,
            retryable: false,
            empty: '',
            missing: null,
            bigint: '12345678901234567890'
        });
        assert.equal(typeof error.bigint, 'bigint');
    });

    it('copies inherited core strings but not inherited extras or non-enumerable fields', async () => {
        class CustomError extends Error {}
        Object.defineProperties(CustomError.prototype, {
            name: {
                value: 'CustomError'
            },
            inheritedCode: {
                value: 'NOT_COPIED', enumerable: true
            }
        });
        const error = new CustomError('custom failed');
        Object.defineProperty(error, 'hidden', {
            value: 'NOT_COPIED'
        });
        error.visible = 'copied';
        const results = await collect([completedTest(error)]);
        assert.deepEqual(results.tests[0].error, {
            name: 'CustomError', message: 'custom failed', visible: 'copied'
        });
    });

    it('treats explicitly enumerable stack as a normal primitive property', async () => {
        const error = new Error('failed');
        Object.defineProperty(error, 'stack', {
            value: 'explicit stack', enumerable: true
        });
        const results = await collect([completedTest(error)]);
        assert.deepEqual(results.tests[0].error, {
            name: 'Error', message: 'failed', stack: 'explicit stack'
        });
    });

    it('omits reserved keys and never coerces non-string core values', async () => {
        const error = new Error('failed');
        Object.defineProperty(error, '__proto__', {
            value: null, enumerable: true
        });
        error.constructor = 'not copied';
        error.prototype = null;
        error.message = {
            toString: () => {
                throw new Error('must not coerce message');
            }
        };
        const results = await collect([completedTest(error)]);
        assert.deepEqual(results.tests[0].error, {
            name: 'Error', message: ''
        });
        assert.equal(Object.getPrototypeOf(results.tests[0].error), Object.prototype);
        assert.equal(Object.hasOwn(results.tests[0].error, '__proto__'), false);
    });

    it('does not expand shared, cyclic or BigInt assertion data', async () => {
        let shared = {
            value: 1n
        };
        for (let i = 0; i < 18; i++) {
            shared = {
                left: shared, right: shared
            };
        }
        const error = new Error('shared error');
        error.actual = shared;
        error.expected = shared;
        error.cause = error;
        const results = await collect([completedTest(error), completedTest(error)]);
        assert.deepEqual(results.tests.map((test) => test.error), [
            {
                name: 'Error', message: 'shared error'
            }, {
                name: 'Error', message: 'shared error'
            }
        ]);
        assert.ok(JSON.stringify(results).length < 2048);
        assert.equal(error.actual, shared);
        assert.equal(error.expected, shared);
        assert.equal(error.cause, error);
    });

    it('recognizes empty skip/todo reasons without treating false as enabled', async () => {
        for (const key of ['skip', 'todo']) {
            for (const value of ['', 'reason', true, false]) {
                for (const error of [null, new Error('test failed')]) {
                    const results = await collect([completedTest(error, {
                        [key]: value
                    })]);
                    let expected = error ? 'failed' : 'passed';
                    if (value !== false) {
                        expected = key === 'skip' ? 'skipped' : 'todo';
                    }
                    assert.equal(results.tests[0].status, expected, `${key}: ${String(value)}`);
                    assert.equal(results.tests[0][key], value);
                }
            }
        }
    });

    it('retains cancellation, skipped and todo states independently of error projection', async () => {
        const cancelled = new Error('parent cancelled');
        cancelled.failureType = 'cancelledByParent';
        const timeout = new Error('timed out');
        timeout.failureType = 'testTimeoutFailure';
        const aborted = new Error('aborted');
        aborted.failureType = 'testAborted';
        const results = await collect([
            completedTest(cancelled),
            completedTest(timeout),
            completedTest(aborted),
            completedTest(null, {
                skip: true
            }),
            completedTest(new Error('not implemented'), {
                todo: 'later'
            })
        ]);
        assert.deepEqual(results.tests.map((test) => test.status), ['cancelled', 'cancelled', 'cancelled', 'skipped', 'todo']);
        assert.deepEqual(results.tests[2].error, {
            name: 'Error', message: 'aborted', failureType: 'testAborted'
        });
        assert.equal(results.complete, false);
    });
});

describe('Node test report cache files', () => {
    let root;
    let cacheDir;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-results-cache-'));
        cacheDir = path.join(root, 'reports', '.cache');
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    it('publishes validated results using coverage cache IDs and preserves other cache data', () => {
        const collector = createTestResultsCollector([], cacheDir);
        const files = getTestResultsFiles(collector.args);
        assert.equal(path.dirname(files.outputPath), cacheDir);
        assert.match(path.basename(files.outputPath), /^test-results-[a-z0-9]{20}\.json\.tmp$/);
        const sibling = path.join(cacheDir, 'keep.json');
        fs.writeFileSync(sibling, 'other coverage data');
        try {
            assert.throws(() => collector.read(), /ENOENT/);
            fs.writeFileSync(files.outputPath, '{broken');
            assert.throws(() => collector.read(), SyntaxError);
            fs.writeFileSync(files.outputPath, '{}');
            assert.throws(() => collector.read(), /Invalid Node test report/);
            const expected = writeTestResults(collector.args, {
                complete: false, summary: null
            });
            assert.equal(collector.readMetadata().complete, false);
            assert.deepEqual(collector.read(), expected);
            collector.publish();
            const published = JSON.parse(fs.readFileSync(files.cachePath, 'utf8'));
            assert.deepEqual(published, expected);
        } finally {
            collector.dispose();
        }
        assert.equal(fs.existsSync(files.outputPath), false);
        assert.equal(fs.existsSync(files.metadataPath), false);
        assert.equal(fs.existsSync(files.cachePath), true);
        assert.equal(fs.readFileSync(sibling, 'utf8'), 'other coverage data');
    });

    it('checks small completion metadata and renames without reading or rewriting the report', (t) => {
        const collector = createTestResultsCollector([], cacheDir);
        const expected = writeTestResults(collector.args);
        const files = getTestResultsFiles(collector.args);
        const read = fs.readFileSync;
        const write = fs.writeFileSync;
        t.mock.method(fs, 'readFileSync', (file, ... args) => {
            assert.notEqual(file, files.outputPath, 'must not materialize the full report without a hook');
            return read(file, ... args);
        });
        t.mock.method(fs, 'writeFileSync', (file, ... args) => {
            assert.notEqual(file, files.outputPath, 'must not rewrite the report without a hook');
            return write(file, ... args);
        });
        try {
            assert.equal(collector.readMetadata().complete, true);
            collector.publish();
            assert.deepEqual(JSON.parse(read(files.cachePath, 'utf8')), expected);
        } finally {
            collector.dispose();
        }
    });

    it('checks UTF-8 byte length after the reporter flushes', async () => {
        const collector = createTestResultsCollector([], cacheDir);
        const files = getTestResultsFiles(collector.args);
        try {
            const events = Array.from({
                length: 1000
            }, (_, index) => completedTest(null, {
                name: `中文测试 🚀 ${index}`
            }));
            const finalSummary = summary();
            finalSummary.data.counts.tests = events.length;
            finalSummary.data.counts.passed = events.length;
            events.push(finalSummary);
            const reporter = new TestReporter(files.id, files.metadataPath);
            let chunks = 0;
            reporter.on('data', () => {
                chunks += 1;
            });
            await pipeline(Readable.from(events), reporter, fs.createWriteStream(files.outputPath));
            assert.ok(chunks > 2 && chunks < 20, `expected bounded batches, got ${chunks} chunks`);
            const metadata = collector.readMetadata();
            assert.equal(metadata.byteLength, fs.statSync(files.outputPath).size);
            const results = collector.read();
            assert.equal(results.tests.length, 1000);
            assert.equal(results.tests[0].name, '中文测试 🚀 0');
            assert.equal(results.tests[999].name, '中文测试 🚀 999');
            collector.publish();
        } finally {
            collector.dispose();
        }
    });

    it('rejects truncated output and malformed completion metadata before publication', () => {
        const collector = createTestResultsCollector([], cacheDir);
        const files = getTestResultsFiles(collector.args);
        try {
            writeTestResults(collector.args);
            fs.appendFileSync(files.outputPath, 'broken');
            assert.throws(() => collector.publish(), /Incomplete Node test report output/);
            assert.equal(fs.existsSync(files.cachePath), false);
            fs.writeFileSync(files.metadataPath, '{broken');
            assert.throws(() => collector.readMetadata(), SyntaxError);
            fs.writeFileSync(files.metadataPath, ' '.repeat(1025));
            assert.throws(() => collector.readMetadata(), /Invalid Node test report metadata/);
        } finally {
            collector.dispose();
        }
    });

    it('isolates collectors sharing the same coverage cache', () => {
        const first = createTestResultsCollector([], cacheDir);
        const second = createTestResultsCollector([], cacheDir);
        const firstFiles = getTestResultsFiles(first.args);
        const secondFiles = getTestResultsFiles(second.args);
        writeTestResults(first.args);
        writeTestResults(second.args);
        try {
            assert.notEqual(firstFiles.outputPath, secondFiles.outputPath);
            first.dispose();
            assert.equal(fs.existsSync(firstFiles.outputPath), false);
            assert.equal(fs.existsSync(firstFiles.metadataPath), false);
            assert.equal(second.read().id, secondFiles.id);
            assert.equal(second.readMetadata().complete, true);
        } finally {
            first.dispose();
            second.dispose();
        }
    });

    it('does not silently repair mismatched user reporters and destinations', () => {
        assert.throws(() => createTestResultsCollector(['--test-reporter=tap', '--test-reporter=spec'], cacheDir), /must match/);
        assert.throws(() => createTestResultsCollector(['--test-reporter-destination=stdout'], cacheDir), /must match/);
    });
});
