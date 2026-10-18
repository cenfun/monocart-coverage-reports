import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { MCR } from '../../lib/index.js';

const cliPath = fileURLToPath(import.meta.resolve('../../lib/cli.js'));

const runCLI = (args, cwd, env) => {
    // This is an independent runner, not a child managed by node:test.
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

describe('mcr test', {
    // node:test applies this deadline to the whole suite, not each test.
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
    const run = (args = ['test'], cwd = root, env = process.env) => runCLI(args, cwd, env);
    const checkReport = () => {
        const data = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-report.json'), 'utf8'));
        assert.equal(data.files.length, 1);
        assert.ok(data.files[0].sourcePath.endsWith('subject.cjs'));
        assert.equal(fs.existsSync(path.join(outputDir, '.v8-coverage')), false);
    };
    const captureTargets = (args) => {
        const captured = path.join(root, 'captured.json');
        write('capture.cjs', `
            if (process.execArgv.includes('--test')) {
                require('fs').writeFileSync(${JSON.stringify(captured)}, JSON.stringify(process.argv.slice(1)));
            }
        `);
        const preload = path.join(root, 'capture.cjs').replace(/\\/g, '/');
        run(args, root, {
            ... process.env,
            NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require "${preload}"`].filter(Boolean).join(' ')
        });
        return JSON.parse(fs.readFileSync(captured, 'utf8'));
    };

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr test '));
        outputDir = path.join(root, 'reports');
        write('subject.cjs', 'module.exports = (value) => value ? 42 : 0;\n');
        write('tests/first.test.cjs', `
            const { test } = require('node:test');
            const assert = require('node:assert/strict');
            const subject = require('../subject.cjs');
            test('first case', () => assert.equal(subject(true), 42));
        `);
        write('tests/nested/second.test.cjs', `
            const { test } = require('node:test');
            const assert = require('node:assert/strict');
            const subject = require('../../subject.cjs');
            test('second case', () => assert.equal(subject(false), 0));
        `);
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    [
        'tests/first.test.cjs',
        'tests/**/*.test.cjs',
        ['tests/*.test.cjs', 'tests/nested/*.test.cjs'],
        ['tests/first.test.cjs', 'tests/nested/second.test.cjs']
    ].forEach((target) => {
        it(`runs configured targets: ${JSON.stringify(target)}`, () => {
            configure(target);
            const result = run();
            assert.equal(result.status, 0, result.stdout + result.stderr);
            checkReport();
        });
    });

    [
        'tests',
        './tests/../tests/**/*.test.cjs',
        'tests\\**\\*.test.cjs',
        ['tests/first.test.cjs', 'tests/first.test.cjs'],
        'tests/[special]/case[1].test.cjs',
        'tests/case{a,b}.test.cjs',
        'missing/**/*.test.cjs'
    ].forEach((target) => {
        it(`forwards config targets unchanged: ${JSON.stringify(target)}`, () => {
            configure(target);
            assert.deepEqual(captureTargets(['test']), Array.isArray(target) ? target : [target]);
        });
    });

    it('forwards CLI targets unchanged, overriding rather than appending config targets', () => {
        configure('missing/**/*.test.cjs');
        const targets = ['./tests/../tests/**/*.test.cjs', 'tests/first.test.cjs', 'tests/first.test.cjs'];
        assert.deepEqual(captureTargets(['test', ... targets]), targets);
    });

    it('lets Node expand globs containing bracketed and brace filenames without a second expansion', () => {
        configure(null);
        write('tests/[special]/case[1].test.cjs', "require('node:test').test('bracket case', () => {});");
        write('tests/case{a,b}.test.cjs', "require('node:test').test('brace case', () => {});");
        const result = run(['test', 'tests/**/*.test.cjs', '--', '--test-reporter=tap']);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /ok \d+ - bracket case/);
        assert.match(result.stdout, /ok \d+ - brace case/);
        checkReport();
    });

    it('does not drop failing tests in bracketed directories', () => {
        configure('tests/**/*.test.cjs');
        write('tests/[special]/failure.test.cjs', `
            require('node:test').test('bracketed failure', () => { throw new Error('must not be skipped'); });
        `);
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /must not be skipped/);
        checkReport();
    });

    it('runs CLI targets without a config file and preserves MCR options', () => {
        const result = run(['test', 'tests/**/*.test.cjs', '-r', 'v8-json', '-o', 'reports', '--entryFilter', '**/subject.cjs']);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        checkReport();
    });

    it('supports MCR options before and after targets and forwards Node runner options', () => {
        configure('missing/**/*.test.cjs');
        fs.renameSync(path.join(root, 'mcr.config.cjs'), path.join(root, 'custom.config.cjs'));
        fs.mkdirSync(path.join(root, 'work'));
        const result = run(['test', '-r', 'v8-json', '../tests/**/*.test.cjs', '-c', '../custom.config.cjs', '-o', '../reports', '--lcov', '--', '--test-name-pattern=first case', '--test-reporter=tap'], path.join(root, 'work'));
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /ok \d+ - first case/);
        assert.doesNotMatch(result.stdout, /ok \d+ - second case/);
        assert.ok(fs.existsSync(path.join(outputDir, 'lcov.info')));
        checkReport();
    });

    it('preserves spaces in explicit CLI file paths', () => {
        configure(null);
        const target = path.join(root, 'tests/first.test.cjs');
        assert.deepEqual(captureTargets(['test', target]), [target]);
        checkReport();
    });

    [
        ['--', 'test', 'tests/**/*.test.cjs'],
        ['-c', 'mcr.config.cjs', '--', 'test', 'tests/**/*.test.cjs', '--', '--test-reporter=tap'],
        ['--', 'test']
    ].forEach((args) => {
        it(`recognizes test after an initial separator: ${JSON.stringify(args)}`, () => {
            configure('tests/**/*.test.cjs');
            const result = run(args);
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.match(result.stdout, /first case/);
            checkReport();
        });
    });

    [null, [], ''].forEach((target) => {
        it(`skips absent test targets: ${JSON.stringify(target)}`, () => {
            configure(target, "onStart: () => { throw new Error('must not start'); }");
            write('reports/.cache/keep', 'old cache');
            const result = run();
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.match(result.stdout, /No test targets configured/);
            assert.ok(fs.existsSync(path.join(root, 'reports/.cache/keep')));
        });
    });

    it('skips tests when the option is omitted', () => {
        write('mcr.config.cjs', 'module.exports = {};');
        const result = run();
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /No test targets configured/);
    });

    it('fails for a missing explicit config even with CLI targets', () => {
        const result = run(['test', 'tests/**/*.test.cjs', '-c', 'missing.config.cjs']);
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /config file does not exist/);
    });

    it('fails for a malformed config instead of skipping tests', () => {
        write('mcr.config.cjs', 'module.exports = { invalid syntax };');
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /Failed to load config file/);
        assert.doesNotMatch(result.stdout, /skipping tests/);
    });

    it('generates a report even on failure and cannot mask the failing status', () => {
        write('failure.test.cjs', `
            require('./subject.cjs')(true);
            require('node:test').test('failure', () => { throw new Error('expected failure'); });
        `);
        configure('failure.test.cjs', 'onEnd: () => { process.exitCode = 0; }');
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /expected failure/);
        checkReport();
    });

    it('uses hooks and removes stale raw data before running', () => {
        configure('tests/**/*.test.cjs', `
            onStart: (coverage) => require('fs').writeFileSync('started', coverage.options.test),
            onReady: (coverage, dir, subprocess) => {
                if (!(subprocess instanceof require('node:child_process').ChildProcess) || !subprocess.pid || !require('fs').existsSync(dir)) throw new Error('invalid onReady arguments');
                require('fs').writeFileSync('ready', 'yes');
            },
            onEnd: () => require('fs').writeFileSync('ended', 'yes')
        `);
        write('reports/.v8-coverage/stale.json', 'invalid json');
        const result = run();
        assert.equal(result.status, 0, result.stdout + result.stderr);
        for (const name of ['started', 'ready', 'ended']) {
            assert.ok(fs.existsSync(path.join(root, name)));
        }
        checkReport();
    });

    it('fails and cleans up when report generation fails', () => {
        configure('tests/**/*.test.cjs', "onEnd: () => { throw new Error('report hook failed'); }");
        const result = run();
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /report hook failed/);
        assert.equal(fs.existsSync(path.join(outputDir, '.v8-coverage')), false);
    });

    it('preserves ordinary command arguments without shell interpretation', () => {
        configure(null);
        write('capture command.cjs', `
            require('./subject.cjs')(true);
            require('fs').writeFileSync('arguments.json', JSON.stringify(process.argv.slice(2)));
        `);
        const args = [
            'with spaces',
            '',
            '"quoted"',
            "'single quoted'",
            'back\\slash\\',
            '$HOME',
            '%PATH%',
            '*.cjs',
            '&&',
            '|',
            '>',
            ';',
            'value & echo injected > injected.txt'
        ];
        const result = run(['--', process.execPath, 'capture command.cjs', ... args]);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'arguments.json'), 'utf8')), args);
        assert.equal(fs.existsSync(path.join(root, 'injected.txt')), false);
        checkReport();
    });
    it('retains an ordinary command failure even when a hook resets exitCode', () => {
        configure(null, 'onEnd: () => { process.exitCode = 0; }');
        write('failure.cjs', "require('./subject.cjs')(true); process.exitCode = 7;");
        const result = run([process.execPath, 'failure.cjs']);
        assert.equal(result.status, 7, result.stdout + result.stderr);
        checkReport();
    });
    it('fails and cleans up when an ordinary command cannot start', () => {
        configure(null);
        const result = run(['mcr-command-that-does-not-exist']);
        assert.notEqual(result.status, 0);
        assert.match(result.stdout + result.stderr, /ENOENT|not recognized|not found/i);
        assert.equal(fs.existsSync(path.join(outputDir, '.v8-coverage')), false);
    });
    it('ignores test for ordinary commands and merge', () => {
        configure('missing/**/*.test.cjs');
        const result = run([process.execPath, '-e', "require('./subject.cjs')(true)"]);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        checkReport();
        write('src/uncovered.cjs', 'module.exports = 42;');
        const merged = run(['merge', '--all', 'src']);
        assert.equal(merged.status, 0, merged.stdout + merged.stderr);
    });

    it('ignores test for API generate and rejects missing configs', async () => {
        configure('missing/**/*.test.cjs');
        write('src/uncovered.cjs', 'module.exports = 42;');
        const coverage = MCR({
            logging: 'off', outputDir, all: path.join(root, 'src')
        });
        await coverage.loadConfig(path.join(root, 'mcr.config.cjs'));
        assert.ok(await coverage.generate());
        const missing = path.join(root, 'missing.config.cjs');
        await assert.rejects(coverage.loadConfig(missing), /config file does not exist/);
    });
});
