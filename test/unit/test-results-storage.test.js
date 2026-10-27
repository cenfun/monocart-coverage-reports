import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const cliPath = fileURLToPath(import.meta.resolve('../../lib/cli.js'));
const token = 'MCR_SYNTHETIC_TOKEN_NOT_A_REAL_SECRET';

const readRawResults = async (rawDir, zip) => {
    if (!zip) {
        const files = fs.readdirSync(rawDir);
        assert.equal(files.some((name) => name.endsWith('.tmp')), false);
        const filename = files.find((name) => name.startsWith('test-results-') && name.endsWith('.json'));
        assert.ok(filename);
        return JSON.parse(fs.readFileSync(path.join(rawDir, filename), 'utf8'));
    }
    const { default: StreamZip } = await import('node-stream-zip');
    const ZipArchive = StreamZip.async;
    const archive = new ZipArchive({
        file: `${rawDir}.zip`
    });
    try {
        const names = Object.keys(await archive.entries());
        assert.equal(names.some((name) => name.endsWith('.tmp')), false);
        const filename = names.find((name) => path.basename(name).startsWith('test-results-') && name.endsWith('.json'));
        assert.ok(filename);
        return JSON.parse((await archive.entryData(filename)).toString());
    } finally {
        await archive.close();
    }
};

describe('test result storage and redaction', {
    timeout: 120000
}, () => {
    let root;
    const write = (name, content) => fs.writeFileSync(path.join(root, name), content);
    const configure = (extra = '') => {
        write('mcr.config.cjs', `module.exports = {
            test: 'case.test.cjs', outputDir: './reports', reports: ['v8-json', 'raw'],
            entryFilter: entry => entry.url.endsWith('/subject.cjs'),
            ${extra}
        };`);
    };
    const execute = (args) => {
        const env = {
            ... process.env, MCR_REVIEW_TOKEN: token
        };
        delete env.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, [cliPath, ... args], {
            cwd: root, env, encoding: 'utf8', timeout: 20000
        });
        assert.ifError(result.error);
        return result;
    };
    const run = (runnerArgs = []) => execute(['test', '--', ... runnerArgs]);
    const checkCoverage = () => {
        const coverage = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-report.json'), 'utf8'));
        assert.equal(coverage.files.length, 1);
        assert.ok(coverage.files[0].sourcePath.endsWith('subject.cjs'));
    };
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-results-storage-'));
        write('subject.cjs', 'module.exports = () => 42;');
        write('case.test.cjs', `
            require('./subject.cjs')();
            require('node:test').test('failed request', () => {
                const error = new Error('request failed');
                error.config = { headers: { authorization: process.env.MCR_REVIEW_TOKEN } };
                throw error;
            });
        `);
        configure();
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    it('does not export nested custom Error objects without a hook', async () => {
        const result = run();
        assert.notEqual(result.status, 0);
        const results = await readRawResults(path.join(root, 'reports/raw'), false);
        assert.deepEqual(results.tests[0].error, {
            name: 'Error', message: 'request failed', code: 'ERR_TEST_FAILURE', failureType: 'testCodeFailure'
        });
        assert.equal(JSON.stringify(results).includes(token), false);
        checkCoverage();
    });

    [
        {
            zip: false, debug: false
        }, {
            zip: true, debug: false
        }, {
            zip: false, debug: true
        }
    ].forEach(({ zip, debug }) => {
        it(`persists hook redaction before raw/debug export (zip: ${zip}, debug: ${debug})`, async () => {
            write('case.test.cjs', `
                require('./subject.cjs')();
                require('node:test').test('request ' + process.env.MCR_REVIEW_TOKEN, () => {
                    throw new Error('Bearer ' + process.env.MCR_REVIEW_TOKEN);
                });
            `);
            configure(`
                reports: ${debug ? "['v8-json']" : `['v8-json', ['raw', { zip: ${zip} }]]`},
                logging: '${debug ? 'debug' : 'info'}',
                onTestEnd: async results => {
                    await Promise.resolve();
                    for (const test of results.tests) {
                        test.name = test.name.replaceAll(process.env.MCR_REVIEW_TOKEN, '[REDACTED]');
                        test.error.message = test.error.message.replaceAll(process.env.MCR_REVIEW_TOKEN, '[REDACTED]');
                    }
                    require('fs').writeFileSync('sanitized.json', JSON.stringify(results));
                }
            `);
            const result = run();
            assert.notEqual(result.status, 0);
            const results = await readRawResults(path.join(root, 'reports', debug ? '.cache' : 'raw'), zip);
            const expected = JSON.parse(fs.readFileSync(path.join(root, 'sanitized.json'), 'utf8'));
            assert.deepEqual(results, expected);
            assert.equal(results.tests[0].name, 'request [REDACTED]');
            assert.equal(results.tests[0].error.message, 'Bearer [REDACTED]');
            assert.equal(JSON.stringify(results).includes(token), false);
            assert.equal(results.summary.failed, 1);
            checkCoverage();
        });
    });

    it('allows hooks to redact sensitive primitive fields before publication', async () => {
        write('case.test.cjs', `
            require('./subject.cjs')();
            const { test } = require('node:test');
            const reason = new Error('cancelled request');
            reason.accessToken = process.env.MCR_REVIEW_TOKEN;
            const controller = new AbortController();
            controller.abort(reason);
            test('cancelled', { signal: controller.signal }, () => {});
        `);
        assert.notEqual(run().status, 0);
        const original = await readRawResults(path.join(root, 'reports/raw'), false);
        assert.equal(original.tests[0].error.accessToken, token);
        configure(`
            onTestEnd: results => {
                for (const test of results.tests) {
                    for (const [key, value] of Object.entries(test.error)) {
                        if (typeof value === 'string') {
                            test.error[key] = value.replaceAll(process.env.MCR_REVIEW_TOKEN, '[REDACTED]');
                        }
                    }
                }
            }
        `);
        assert.notEqual(run().status, 0);
        const redacted = await readRawResults(path.join(root, 'reports/raw'), false);
        assert.equal(redacted.tests[0].error.accessToken, '[REDACTED]');
        assert.equal(JSON.stringify(redacted).includes(token), false);
        assert.equal(redacted.summary.cancelled, 1);
        checkCoverage();
    });

    it('does not publish unredacted results if the hook throws', () => {
        configure("onTestEnd: () => { throw new Error('redaction failed'); }");
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /redaction failed/);
        const rawDir = path.join(root, 'reports/raw');
        const files = fs.readdirSync(rawDir);
        assert.equal(files.some((name) => name.startsWith('test-results-')), false);
        assert.equal(files.some((name) => name.endsWith('.tmp')), false);
        checkCoverage();
    });

    it('keeps shared assertion graphs out of the report', async () => {
        write('case.test.cjs', `
            require('./subject.cjs')();
            require('node:test').test('graph', () => {
                let shared = { value: 'sample' };
                for (let i = 0; i < 18; i++) shared = { left: shared, right: shared };
                const error = new Error('graph failed');
                error.actual = shared;
                error.expected = shared;
                throw error;
            });
        `);
        const result = run();
        assert.notEqual(result.status, 0);
        const results = await readRawResults(path.join(root, 'reports/raw'), false);
        assert.deepEqual(results.tests[0].error, {
            name: 'Error', message: 'graph failed', code: 'ERR_TEST_FAILURE', failureType: 'testCodeFailure'
        });
        assert.ok(JSON.stringify(results).length < 4096);
        checkCoverage();
    });

    it('coverage-only ZIP merging skips unrelated test-result JSON before parsing', async () => {
        assert.notEqual(run().status, 0);
        const { ZipFile } = await import('yazl');
        const zip = new ZipFile();
        const zipPath = path.join(root, 'input.zip');
        const done = pipeline(zip.outputStream, fs.createWriteStream(zipPath));
        const rawDir = path.join(root, 'reports/raw');
        for (const filename of fs.readdirSync(rawDir)) {
            zip.addFile(path.join(rawDir, filename), `raw/${filename}`);
        }
        zip.addBuffer(Buffer.from('{not coverage JSON'), 'raw/test-results-unrelated.json');
        zip.end();
        await done;
        const merged = execute(['merge', '-i', zipPath, '-o', 'merged', '-r', 'v8-json']);
        assert.equal(merged.status, 0, merged.stdout + merged.stderr);
        const coverage = JSON.parse(fs.readFileSync(path.join(root, 'merged/coverage-report.json'), 'utf8'));
        assert.equal(coverage.files.length, 1);
        assert.ok(coverage.files[0].sourcePath.endsWith('subject.cjs'));
    });

    it('finishes streamed results when Node uses --test-force-exit', async () => {
        write('case.test.cjs', `
            require('./subject.cjs')();
            require('node:test').test('passing', () => {});
            require('node:test').test('passing second', () => {});
            setInterval(() => {}, 1000);
        `);
        const result = run(['--test-force-exit']);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const results = await readRawResults(path.join(root, 'reports/raw'), false);
        assert.equal(results.complete, true);
        assert.equal(results.summary.passed, 2);
        assert.equal(results.tests.length, 2);
        checkCoverage();
    });
});
