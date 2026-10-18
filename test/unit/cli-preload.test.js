import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(import.meta.resolve('../../lib/cli.js'));

describe('CLI native ESM preloads', {
    timeout: 15000
}, () => {
    let root;
    const write = (name, content) => {
        const file = path.join(root, name);
        fs.mkdirSync(path.dirname(file), {
            recursive: true
        });
        fs.writeFileSync(file, content);
    };
    const run = (option, preload) => {
        // Let the nested CLI start an independent Node test runner.
        const env = {
            ... process.env
        };
        delete env.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, [cli, option, preload, 'test'], {
            cwd: root, env, encoding: 'utf8', timeout: 10000
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-report.json'), 'utf8'));
        assert.equal(report.files.length, 1);
        assert.ok(report.files[0].sourcePath.endsWith('subject.cjs'));
    };
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr preload '));
        write('subject.cjs', 'module.exports = (v) => v ? 42 : 0;');
        write('mcr.config.cjs', `module.exports = {
            test: 'preload.test.cjs', outputDir: './reports', reports: ['v8-json'],
            entryFilter: (entry) => entry.url.endsWith('/subject.cjs'),
            onStart: () => {
                if (!globalThis.mcrPreloaded) throw new Error('preload missing in parent');
            }
        };`);
        write('preload.test.cjs', `require('node:test').test('preloaded', () => {
            require('node:assert/strict').equal(globalThis.mcrPreloaded, true);
            require('./subject.cjs')(true);
        });`);
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    ['--import', '--require'].forEach((option) => {
        ['mjs', 'cjs'].forEach((extension) => {
            [false, true].forEach((absolute) => {
                it(`imports ${extension} via ${option} using an ${absolute ? 'absolute' : 'explicit relative'} path with spaces`, () => {
                    const name = `preload files/register.${extension}`;
                    const source = extension === 'mjs' ? 'await Promise.resolve();' : '';
                    write(name, `${source} globalThis.mcrPreloaded = true;`);
                    run(option, absolute ? path.join(root, name) : `./${name}`);
                });
            });
        });
    });

    it('supports native ESM URL specifiers', () => {
        run('--import', 'data:text/javascript,await%20Promise.resolve();globalThis.mcrPreloaded=true;');
    });
});
