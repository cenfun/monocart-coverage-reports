import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(import.meta.resolve('../../lib/cli.js'));

const readRawResults = async (outputDir, filename, zip) => {
    if (!zip) {
        const files = fs.readdirSync(path.join(outputDir, 'raw'));
        assert.equal(files.some((name) => name.endsWith('.tmp')), false);
        const resultsFile = filename || files.find((name) => name.startsWith('test-results-') && name.endsWith('.json'));
        assert.ok(resultsFile);
        return JSON.parse(fs.readFileSync(path.join(outputDir, 'raw', resultsFile), 'utf8'));
    }
    const { default: StreamZip } = await import('node-stream-zip');
    const ZipArchive = StreamZip.async;
    const archive = new ZipArchive({
        file: path.join(outputDir, 'raw.zip')
    });
    try {
        const entries = Object.keys(await archive.entries());
        assert.equal(entries.some((name) => name.endsWith('.tmp')), false);
        const entry = filename ? `raw/${filename}` : entries.find((name) => path.basename(name).startsWith('test-results-') && name.endsWith('.json'));
        assert.ok(entry);
        return JSON.parse((await archive.entryData(entry)).toString());
    } finally {
        await archive.close();
    }
};

describe('onTestEnd', {
    timeout: 120000
}, () => {
    let root;
    let outputDir;
    const write = (name, content) => {
        const file = path.join(root, name);
        fs.mkdirSync(path.dirname(file), {
            recursive: true
        });
        fs.writeFileSync(file, content);
    };
    const configure = (test, extra = '') => {
        write('mcr.config.cjs', `module.exports = {
            test: ${JSON.stringify(test)}, outputDir: './reports', reports: ['v8-json'],
            entryFilter: (entry) => entry.url.endsWith('/subject.cjs'),
            ${extra}
        };`);
    };
    const run = (args = ['test'], cwd = root, env = process.env) => {
        const childEnv = {
            ... env
        };
        delete childEnv.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, [cliPath, ... args], {
            cwd, env: childEnv, encoding: 'utf8', timeout: 20000
        });
        assert.ifError(result.error);
        return result;
    };
    const checkReport = () => {
        const data = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-report.json'), 'utf8'));
        assert.equal(data.files.length, 1);
        assert.ok(data.files[0].sourcePath.endsWith('subject.cjs'));
        assert.equal(fs.existsSync(path.join(outputDir, '.v8-coverage')), false);
    };
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr test hook '));
        outputDir = path.join(root, 'reports');
        write('subject.cjs', 'module.exports = (value) => value ? 42 : 0;\n');
        write('tests/first.test.cjs', `
            require('../subject.cjs')(true);
            require('node:test').test('first case', () => {});
        `);
        write('tests/nested/second.test.cjs', `
            require('../../subject.cjs')(false);
            require('node:test').test('second case', () => {});
        `);
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    it('delivers structured test results before onReady and onEnd', () => {
        configure('tests/**/*.test.cjs', `
            onTestEnd: async (results) => {
                await Promise.resolve();
                require('fs').writeFileSync('test-results.json', JSON.stringify(results));
                require('fs').appendFileSync('hooks', 'testEnd\\n');
            },
            onReady: () => require('fs').appendFileSync('hooks', 'ready\\n'),
            onEnd: () => require('fs').appendFileSync('hooks', 'end\\n')
        `);
        const result = run();
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const results = JSON.parse(fs.readFileSync(path.join(root, 'test-results.json'), 'utf8'));
        assert.match(results.id, /^[a-z0-9]{20}$/);
        assert.equal(results.framework, 'node:test');
        assert.equal(results.complete, true);
        assert.equal(results.summary.tests, 2);
        assert.equal(results.summary.passed, 2);
        assert.equal(results.summary.failed, 0);
        assert.equal(results.summary.success, true);
        assert.ok(results.summary.duration >= 0);
        assert.deepEqual(results.tests.map((test) => test.name).sort(), ['first case', 'second case']);
        assert.ok(results.tests.every((test) => test.status === 'passed' && test.file && test.line && test.duration >= 0));
        assert.equal(fs.readFileSync(path.join(root, 'hooks'), 'utf8'), 'testEnd\nready\nend\n');
        assert.match(result.stdout, /first case/);
        checkReport();
    });

    it('uses runner summary counts for suites, nested tests, skipped and todo tests', () => {
        write('mixed.test.cjs', `
            require('./subject.cjs')(true);
            const { describe, it, test } = require('node:test');
            const assert = require('node:assert/strict');
            describe('suite', () => {
                it('pass', () => {});
                it('skip', { skip: 'not today' }, () => {});
                it('todo', { todo: 'later' }, () => { throw new Error('todo error'); });
                it('fail', () => assert.equal(1, 2));
            });
            test('parent', async (t) => { await t.test('nested', () => {}); });
        `);
        configure('mixed.test.cjs', `
            onTestEnd: (results) => {
                require('fs').writeFileSync('test-results.json', JSON.stringify(results));
                process.exitCode = 0;
            },
            onEnd: () => { process.exitCode = 0; }
        `);
        const result = run();
        assert.notEqual(result.status, 0);
        const results = JSON.parse(fs.readFileSync(path.join(root, 'test-results.json'), 'utf8'));
        assert.equal(results.complete, true);
        assert.deepEqual({
            ... results.summary, duration: 0
        }, {
            tests: 6,
            suites: 1,
            passed: 3,
            failed: 1,
            cancelled: 0,
            skipped: 1,
            todo: 1,
            duration: 0,
            success: false
        });
        assert.equal(results.tests.length, 7);
        assert.equal(results.tests.find((test) => test.name === 'suite').type, 'suite');
        assert.equal(results.tests.find((test) => test.name === 'nested').nesting, 1);
        assert.equal(results.tests.find((test) => test.name === 'skip').skip, 'not today');
        assert.equal(results.tests.find((test) => test.name === 'todo').status, 'todo');
        const failure = results.tests.find((test) => test.name === 'fail');
        assert.equal(failure.status, 'failed');
        assert.deepEqual(Object.keys(failure.error).sort(), ['code', 'failureType', 'message', 'name']);
        assert.equal(failure.error.name, 'Error');
        assert.equal(failure.error.code, 'ERR_TEST_FAILURE');
        assert.equal(failure.error.failureType, 'testCodeFailure');
        assert.match(failure.error.message, /Expected values to be strictly equal/);
        checkReport();
    });

    [
        ['--test-reporter=tap'],
        ['--test-reporter', 'tap', '--test-reporter-destination', 'stdout'],
        ['--test-reporter=tap', '--test-reporter=junit', '--test-reporter-destination=stdout', '--test-reporter-destination=runner.xml']
    ].forEach((runnerArgs) => {
        it(`preserves user reporters with onTestEnd: ${JSON.stringify(runnerArgs)}`, () => {
            configure('tests/**/*.test.cjs', "onTestEnd: () => require('fs').writeFileSync('test-ended', 'yes')");
            const result = run(['test', '--', ... runnerArgs]);
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.match(result.stdout, /ok \d+ - first case/);
            assert.ok(fs.existsSync(path.join(root, 'test-ended')));
            if (runnerArgs.includes('--test-reporter=junit')) {
                assert.match(fs.readFileSync(path.join(root, 'runner.xml'), 'utf8'), /<testsuites/);
            }
            checkReport();
        });
    });

    it('preserves reporters inherited through NODE_OPTIONS alongside CLI reporters', () => {
        configure('tests/**/*.test.cjs', "onTestEnd: () => require('fs').writeFileSync('test-ended', 'yes')");
        const result = run(['test', '--', '--test-reporter=junit', '--test-reporter-destination=runner.xml'], root, {
            ... process.env,
            NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --test-reporter=tap --test-reporter-destination=stdout`
        });
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /ok \d+ - first case/);
        assert.match(fs.readFileSync(path.join(root, 'runner.xml'), 'utf8'), /<testsuites/);
        assert.ok(fs.existsSync(path.join(root, 'test-ended')));
        checkReport();
    });

    it('retains a rejected test hook failure and still generates coverage', () => {
        configure('tests/**/*.test.cjs', `
            onTestEnd: async () => { throw new Error('test hook failed'); },
            onEnd: () => { process.exitCode = 0; }
        `);
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /test hook failed/);
        checkReport();
    });

    it('preserves finalized results alongside coverage cache when coverage onEnd fails', () => {
        configure('tests/**/*.test.cjs', `
            onTestEnd: () => require('fs').writeFileSync('test-ended', 'yes'),
            onEnd: () => { throw new Error('coverage hook failed'); }
        `);
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /coverage hook failed/);
        assert.ok(fs.existsSync(path.join(root, 'test-ended')));
        const cachedFiles = fs.readdirSync(path.join(outputDir, '.cache'));
        assert.ok(cachedFiles.some((name) => name.startsWith('coverage-')));
        const resultsFile = cachedFiles.find((name) => name.startsWith('test-results-') && name.endsWith('.json'));
        assert.ok(resultsFile);
        const results = JSON.parse(fs.readFileSync(path.join(outputDir, '.cache', resultsFile), 'utf8'));
        assert.equal(resultsFile, `test-results-${results.id}.json`);
        assert.equal(results.summary.passed, 2);
        assert.equal(cachedFiles.some((name) => name.endsWith('.tmp')), false);
        checkReport();
    });

    it('continues coverage generation when onTestEnd throws a non-Error value', () => {
        configure('tests/**/*.test.cjs', `
            onTestEnd: () => { throw null; },
            onEnd: () => { process.exitCode = 0; }
        `);
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /onTestEnd failed: null/);
        checkReport();
    });

    it('fails for missing test results without invoking onTestEnd', () => {
        configure('tests/**/*.test.cjs', "onTestEnd: () => require('fs').writeFileSync('test-ended', 'yes')");
        const result = run(['test', '--', '--invalid-node-runner-option']);
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /Node test report collection or onTestEnd failed/);
        assert.equal(fs.existsSync(path.join(root, 'test-ended')), false);
        assert.equal(fs.existsSync(path.join(outputDir, '.v8-coverage')), false);
    });

    it('delivers test results even when there is no matching coverage', () => {
        write('empty.test.cjs', "require('node:test').test('no coverage', () => {});");
        configure('empty.test.cjs', "onTestEnd: (results) => require('fs').writeFileSync('test-results.json', JSON.stringify(results))");
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /No coverage report was generated/);
        const results = JSON.parse(fs.readFileSync(path.join(root, 'test-results.json'), 'utf8'));
        assert.equal(results.complete, true);
        assert.equal(results.summary.passed, 1);
    });

    it('reports timeout cancellations without masking the failing test status', () => {
        write('timeout.test.cjs', `
            require('./subject.cjs')(true);
            require('node:test').test('timeout', { timeout: 20 }, async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
            });
        `);
        configure('timeout.test.cjs', "onTestEnd: (results) => require('fs').writeFileSync('test-results.json', JSON.stringify(results))");
        const result = run();
        assert.notEqual(result.status, 0);
        const results = JSON.parse(fs.readFileSync(path.join(root, 'test-results.json'), 'utf8'));
        assert.equal(results.complete, true);
        assert.equal(results.summary.cancelled, 1);
        assert.equal(results.tests[0].status, 'cancelled');
        checkReport();
    });

    [false, true].flatMap((zip) => [false, true].map((withHook) => ({
        zip, withHook
    }))).forEach(({ zip, withHook }) => {
        it(`exports finalized results with raw coverage (zip: ${zip}, hook: ${withHook})`, async () => {
            configure('tests/**/*.test.cjs', `
                reports: ['v8-json', ['raw', { zip: ${zip} }]],
                ${withHook ? "onTestEnd: (results) => require('fs').writeFileSync('test-results.json', JSON.stringify(results))" : ''}
            `);
            const result = run();
            assert.equal(result.status, 0, result.stdout + result.stderr);
            const expected = withHook ? JSON.parse(fs.readFileSync(path.join(root, 'test-results.json'), 'utf8')) : null;
            const exported = await readRawResults(outputDir, expected ? `test-results-${expected.id}.json` : null, zip);
            assert.match(exported.id, /^[a-z0-9]{20}$/);
            assert.equal(exported.complete, true);
            assert.equal(exported.summary.passed, 2);
            if (withHook) {
                assert.deepEqual(exported, expected);
            }
            checkReport();
            const merged = run(['merge', '-i', zip ? 'reports/raw.zip' : 'reports/raw', '-o', 'merged', '-r', 'v8-json']);
            assert.equal(merged.status, 0, merged.stdout + merged.stderr);
            const coverage = JSON.parse(fs.readFileSync(path.join(root, 'merged/coverage-report.json'), 'utf8'));
            assert.equal(coverage.files.length, 1);
        });
    });

    it('retains test results in debug cache without onTestEnd or temporary output', () => {
        configure('tests/**/*.test.cjs', "logging: 'debug'");
        const result = run();
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const cacheDir = path.join(outputDir, '.cache');
        const filename = fs.readdirSync(cacheDir).find((name) => name.startsWith('test-results-') && name.endsWith('.json'));
        assert.ok(filename);
        const cached = JSON.parse(fs.readFileSync(path.join(cacheDir, filename), 'utf8'));
        assert.equal(filename, `test-results-${cached.id}.json`);
        assert.equal(cached.summary.passed, 2);
        assert.equal(fs.readdirSync(cacheDir).some((name) => name.endsWith('.tmp')), false);
    });

    it('does not invoke onTestEnd when targets are absent', () => {
        configure(null, "onTestEnd: () => { throw new Error('must not run'); }");
        const result = run();
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /No test targets configured/);
    });

});
