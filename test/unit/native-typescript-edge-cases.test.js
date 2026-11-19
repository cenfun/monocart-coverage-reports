import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';
import { createTempRoot } from './unit-utils.js';

const register = import.meta.resolve('monocart-coverage-reports/register');
const run = (args, cwd, coverageDir) => {
    const child = spawnSync(process.execPath, args, {
        cwd,
        env: {
            ... process.env, NODE_V8_COVERAGE: coverageDir
        },
        encoding: 'utf8',
        timeout: 10000
    });
    assert.ifError(child.error);
    return child;
};
const mergeRaw = (inputDir, outputDir) => MCR({
    logging: 'off', inputDir: path.join(inputDir, 'raw'), outputDir, reports: ['v8-json']
}).generate();

describe('native TypeScript source edge cases', () => {
    let root;
    let serial;
    beforeEach(() => {
        root = createTempRoot('mcr-native-ts-edge-');
        serial = 0;
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const collect = (source, name = 'subject.ts', sourceURL = false) => {
        const dir = path.join(root, String(serial++));
        fs.mkdirSync(dir);
        const file = path.join(dir, name);
        const coverageDir = path.join(dir, 'coverage');
        fs.writeFileSync(file, sourceURL ? `${source}\n//# sourceURL=${pathToFileURL(file).href}\n` : source);
        const child = run(['--import', register, file], root, coverageDir);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        return {
            dir, file, coverageDir, name
        };
    };
    const report = async (input, extra = {}) => {
        const outputDir = path.join(root, `report-${serial++}`);
        const instance = MCR({
            logging: 'off',
            reports: ['v8-json', 'raw'],
            outputDir,
            entryFilter: (item) => item.url.endsWith(`/${input.name}`),
            ... extra
        });
        await instance.addFromDir(input.coverageDir);
        const result = await instance.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        return {
            file: result.files[0], outputDir
        };
    };
    const javascriptReport = (source) => report(collect(source, 'subject.mjs', true), {
        // Node appends sourceURL to native TS. Match that V8 runtime span while
        // analyzing only the original source, just like the native capture.
        onEntry: (item) => {
            item.source = source;
        }
    });

    it('parses a BOM followed by a shebang without inventing statements', async () => {
        const text = '\uFEFF#!/usr/bin/env node\nexport function pick(value: number) { return value ? 1 : 0; }\npick(1);\n';
        const native = await report(collect(text));
        // Replace the shebang with an equal-length comment in the JS reference.
        const javascript = await javascriptReport(` //${stripTypeScriptTypes(text).slice(2)}`);
        assert.equal(native.file.source, text);
        assert.deepEqual(native.file.data, javascript.file.data);
        assert.deepEqual(native.file.summary, javascript.file.summary);
        assert.ok(native.file.data.statements.every((statement) => statement.start >= text.indexOf('export')));
        const merged = await mergeRaw(native.outputDir, path.join(root, 'merged-shebang'));
        assert.ok(merged);
        assert.deepEqual(merged.files[0].data, native.file.data);
    });

    it('associates source versions with worker threads sharing the same process', async () => {
        const versions = [
            'export function first(value: number) { return value; }\nfirst(1);\n',
            'export function second(value: number) { return value * 2; }\nsecond(2);\n'
        ];
        fs.writeFileSync(path.join(root, 'worker.mjs'), "import './subject.ts';\n");
        const runner = path.join(root, 'runner.mjs');
        fs.writeFileSync(runner, `import fs from 'node:fs';
            import { Worker } from 'node:worker_threads';
            for (const source of ${JSON.stringify(versions)}) {
                fs.writeFileSync(new URL('./subject.ts', import.meta.url), source);
                await new Promise((resolve, reject) => {
                    const worker = new Worker(new URL('./worker.mjs', import.meta.url), {
                        execArgv: ['--import', ${JSON.stringify(register)}]
                    });
                    worker.on('error', reject);
                    worker.on('exit', code => code === 0 ? resolve() : reject(new Error('Worker failed: ' + code)));
                });
            }`);
        const coverageDir = path.join(root, 'worker-coverage');
        const child = run([runner], root, coverageDir);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        const instance = MCR({
            logging: 'off',
            reports: ['v8-json'],
            outputDir: path.join(root, 'worker-report'),
            entryFilter: (item) => item.url.endsWith('/subject.ts')
        });
        await instance.addFromDir(coverageDir);
        const result = await instance.generate();
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [... versions].sort());
        assert.ok(result.files.every((file) => file.data.functions[0].count === 1));
    });

    it('keeps different builds of one URL paired with their captured sources', async () => {
        const versions = [
            'export function first(value: number) { return value; }\nfirst(1);\n',
            'export function secondWithLongerName(value: number) { return value + 123; }\nsecondWithLongerName(2);\n'
        ];
        const input = collect(versions[0]);
        fs.writeFileSync(input.file, versions[1]);
        const child = run(['--import', register, input.file], root, input.coverageDir);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        fs.writeFileSync(input.file, 'throw new Error("must not read the latest disk source");');
        const reportInstance = MCR({
            logging: 'off',
            outputDir: path.join(root, 'versions'),
            reports: ['v8-json', 'raw'],
            entryFilter: (item) => item.url.endsWith('/subject.ts')
        });
        await reportInstance.addFromDir(input.coverageDir);
        const result = await reportInstance.generate();
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [... versions].sort());
        for (const file of result.files) {
            const name = file.source.includes('secondWithLongerName') ? 'secondWithLongerName' : 'first';
            assert.equal(file.data.functions.length, 1);
            assert.equal(file.data.functions[0].name, name);
            assert.equal(file.data.functions[0].count, 1);
        }
        const merged = await mergeRaw(path.join(root, 'versions'), path.join(root, 'merged-versions'));
        assert.ok(merged);
        assert.equal(merged.files.length, 2);
        assert.deepEqual(merged.files.map((file) => file.source).sort(), [... versions].sort());
    });

});
