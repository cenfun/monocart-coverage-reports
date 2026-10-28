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

describe('mcr test result regressions', {
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
    const run = (runnerArgs = [], env = process.env) => {
        const childEnv = {
            ... env
        };
        delete childEnv.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, [cliPath, 'test', '--', ... runnerArgs], {
            cwd: root, env: childEnv, encoding: 'utf8', timeout: 20000
        });
        assert.ifError(result.error);
        return result;
    };
    const readResults = () => {
        const rawDir = path.join(root, 'reports/raw');
        const files = fs.readdirSync(rawDir);
        const resultFiles = files.filter((name) => name.startsWith('test-results-') && name.endsWith('.json'));
        assert.equal(resultFiles.length, 1);
        assert.equal(files.some((name) => name.endsWith('.tmp')), false);
        const results = JSON.parse(fs.readFileSync(path.join(rawDir, resultFiles[0]), 'utf8'));
        assert.equal(resultFiles[0], `test-results-${results.id}.json`);
        assert.equal(results.complete, true);
        return results;
    };
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-test-regression-'));
        write('subject.cjs', 'module.exports = () => 42;');
        write('case.test.cjs', `
            require('./subject.cjs')();
            require('node:test').test('passing', () => {});
        `);
        configure();
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    [false, true].forEach((withHook) => {
        it(`preserves empty skip/todo reasons and matching statuses (hook: ${withHook})`, () => {
            write('case.test.cjs', `
                require('./subject.cjs')();
                const { test } = require('node:test');
                test('skipped', { skip: '' }, () => {});
                test('todo passing', { todo: '' }, () => {});
                test('todo failing', { todo: '' }, () => { throw new Error('not implemented'); });
                test('passing', { skip: false, todo: false }, () => {});
            `);
            if (withHook) {
                configure("onTestEnd: results => require('fs').writeFileSync('hook-results.json', JSON.stringify(results))");
            }
            const result = run();
            assert.equal(result.status, 0, result.stdout + result.stderr);
            const results = readResults();
            assert.deepEqual(results.tests.map((test) => test.status), ['skipped', 'todo', 'todo', 'passed']);
            assert.equal(results.tests[0].skip, '');
            assert.equal(results.tests[1].todo, '');
            assert.equal(results.tests[2].todo, '');
            assert.equal(results.summary.tests, 4);
            assert.equal(results.summary.skipped, 1);
            assert.equal(results.summary.todo, 2);
            assert.equal(results.summary.passed, 1);
            assert.equal(results.summary.failed, 0);
            assert.equal(results.summary.success, true);
            if (withHook) {
                const hooked = JSON.parse(fs.readFileSync(path.join(root, 'hook-results.json'), 'utf8'));
                assert.deepEqual(hooked, results);
            }
        });
    });

    ['onReady', 'onEnd'].forEach((hook) => {
        it(`preserves onTestEnd exitCode when ${hook} resets it`, () => {
            configure(`
                onTestEnd: () => { process.exitCode = 7; },
                ${hook}: () => { process.exitCode = 0; }
            `);
            const result = run();
            assert.equal(result.status, 7, result.stdout + result.stderr);
            assert.equal(readResults().summary.passed, 1);
        });
    });

    it('does not replace a later nonzero coverage hook exitCode with the saved test hook code', () => {
        configure(`
            onTestEnd: () => { process.exitCode = 7; },
            onEnd: () => { process.exitCode = 5; }
        `);
        const result = run();
        assert.equal(result.status, 5, result.stdout + result.stderr);
        assert.equal(readResults().summary.passed, 1);
    });

    ['before', 'during'].forEach((when) => {
        it(`reports AbortController cancellation ${when} test execution`, () => {
            write('case.test.cjs', `
                require('./subject.cjs')();
                const { test } = require('node:test');
                const controller = new AbortController();
                ${when === 'before' ? "controller.abort(new Error('stopped'));" : ''}
                test('aborted', { signal: controller.signal }, async () => {
                    setTimeout(() => controller.abort(new Error('stopped')), 10);
                    await new Promise(resolve => setTimeout(resolve, 30));
                });
            `);
            const result = run();
            assert.notEqual(result.status, 0);
            const results = readResults();
            assert.equal(results.summary.cancelled, 1);
            assert.equal(results.summary.failed, 0);
            assert.equal(results.tests[0].status, 'cancelled');
            assert.deepEqual(results.tests[0].error, {
                name: 'Error', message: 'stopped', failureType: 'testAborted'
            });
        });
    });

    it('inserts internal reporter options before the Node end-of-options marker', () => {
        const result = run(['--test-reporter=tap', '--']);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /ok \d+ - passing/);
        assert.equal(readResults().summary.passed, 1);
    });

    [
        ['--test_reporter=tap'],
        ['--test_reporter', 'tap', '--test_reporter_destination', 'stdout'],
        ['--test_reporter=tap', '--test-reporter=junit', '--test_reporter_destination=stdout', '--test-reporter-destination=runner.xml']
    ].forEach((runnerArgs) => {
        it(`preserves Node underscore option aliases: ${JSON.stringify(runnerArgs)}`, () => {
            const result = run(runnerArgs);
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.match(result.stdout, /ok \d+ - passing/);
            assert.equal((result.stdout.match(/^ok \d+ - passing$/gm) || []).length, 1);
            assert.doesNotMatch(result.stdout, /✔ passing/);
            assert.equal(readResults().summary.passed, 1);
            if (runnerArgs.includes('--test-reporter=junit')) {
                assert.match(fs.readFileSync(path.join(root, 'runner.xml'), 'utf8'), /<testsuites/);
            }
        });
    });

    it('supports underscore aliases in NODE_OPTIONS alongside CLI reporters', () => {
        const result = run(['--test-reporter=junit', '--test-reporter-destination=runner.xml'], {
            ... process.env,
            NODE_OPTIONS: [process.env.NODE_OPTIONS, '--test_reporter=tap --test_reporter_destination=stdout'].filter(Boolean).join(' ')
        });
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /ok \d+ - passing/);
        assert.equal((result.stdout.match(/^ok \d+ - passing$/gm) || []).length, 1);
        assert.doesNotMatch(result.stdout, /✔ passing/);
        assert.match(fs.readFileSync(path.join(root, 'runner.xml'), 'utf8'), /<testsuites/);
        assert.equal(readResults().summary.passed, 1);
    });
});
