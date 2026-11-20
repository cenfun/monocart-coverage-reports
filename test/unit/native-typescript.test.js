import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import * as acorn from 'acorn';
import { MCR } from '../../lib/index.js';

const cli = fileURLToPath(import.meta.resolve('../../lib/cli.js'));

describe('native TypeScript coverage', {
    timeout: 30000
}, () => {
    let root;
    const write = (name, source) => {
        const filename = path.join(root, name);
        fs.writeFileSync(filename, source);
        return filename;
    };
    const run = (args, env = {}) => {
        const childEnv = {
            ... process.env, ... env
        };
        delete childEnv.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, args, {
            cwd: root, env: childEnv, encoding: 'utf8', timeout: 15000
        });
        assert.ifError(result.error);
        return result;
    };
    const collect = (filename, name = 'coverage') => {
        const dir = path.join(root, name);
        const child = run(['--import', import.meta.resolve('monocart-coverage-reports/register'), filename], {
            NODE_V8_COVERAGE: dir
        });
        assert.equal(child.status, 0, child.stdout + child.stderr);
        return dir;
    };
    const reporter = (options = {}) => MCR({
        logging: 'off',
        baseDir: root,
        outputDir: path.join(root, 'report'),
        reports: ['v8-json'],
        entryFilter: (entry) => entry.url.includes('/subject.'),
        ... options
    });
    const generate = async (coverage) => {
        const result = await coverage.generate();
        assert.ok(result, 'a report must be generated');
        assert.equal(result.files.length, 1);
        return result.files[0];
    };

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr native ts '));
        write('package.json', '{"type":"module"}\n');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    ['ts', 'mts', 'cts'].forEach((extension) => {
        ['', '\uFEFF', '\uFEFF#!/usr/bin/env node\n'].forEach((prefix) => {
            it(`captures and analyzes .${extension} with prefix ${JSON.stringify(prefix)}`, async () => {
                const source = `${prefix}interface Info { label: string; }\nfunction choose(value: number): string {\n    if (value > 0) {\n        return '原生 TS 🚀';\n    } else {\n        return 'other';\n    }\n}\nfunction unused(): number { return 0; }\nchoose(1);\n`;
                const filename = write(`subject.${extension}`, source);
                const dir = collect(filename);
                const url = pathToFileURL(filename).href;
                const captured = fs.readdirSync(dir).filter((name) => name.startsWith('source-')).map((name) => {
                    return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
                }).find((item) => item.url === url);
                assert.deepEqual(captured, {
                    url, source, nativeTypeScript: true
                });
                // Reporting must use the captured build, not a later filesystem version.
                fs.writeFileSync(filename, 'this is not valid TypeScript');
                const coverage = reporter({
                    onEntry: (entry) => {
                        assert.equal(entry.source, stripTypeScriptTypes(source));
                        assert.deepEqual(entry.sourceMap.sourcesContent, [source]);
                        acorn.parse(entry.source, {
                            ecmaVersion: 'latest'
                        });
                    }
                });
                await coverage.addFromDir(dir);
                const file = await generate(coverage);
                assert.equal(file.nativeTypeScript, true);
                assert.equal(Object.hasOwn(file, 'hasBOM'), false);
                assert.equal(file.source, source);
                assert.equal(file.summary.functions.total, 2);
                assert.equal(file.summary.functions.covered, 1);
                assert.equal(file.summary.branches.total, 2);
                assert.equal(file.summary.branches.covered, 1);
                const choose = file.data.functions.find((fn) => fn.name === 'choose');
                assert.equal(choose.count, 1);
                assert.ok(file.source.slice(choose.start, choose.end).startsWith('function choose'));
                assert.equal(file.data.functions.find((fn) => fn.name === 'unused').count, 0);
                assert.ok(file.data.statements.some((statement) => statement.count === 0));
                for (const range of [... file.data.functions, ... file.data.statements, ... file.data.bytes]) {
                    assert.ok(range.start >= 0 && range.end <= file.source.length, JSON.stringify(range));
                }
            });
        });
    });

    it('captures .cts loaded with createRequire, including native-path coverage on Node 22', async () => {
        const source = '\uFEFF#!/usr/bin/env node\nfunction choose(value: number) { return value ? 1 : 0; }\nmodule.exports = choose(1);\n';
        write('subject.cts', source);
        const dir = collect(write('entry.mjs', `
            import { createRequire } from 'node:module';
            createRequire(import.meta.url)('./subject.cts');
        `));
        const coverage = reporter();
        await coverage.addFromDir(dir);
        const file = await generate(coverage);
        assert.equal(file.sourcePath, 'subject.cts');
        assert.equal(file.nativeTypeScript, true);
        assert.equal(file.source, source);
        assert.equal(file.summary.functions.covered, 1);
        assert.equal(file.summary.branches.covered, 1);
    });

    it('preserves JS, its map and original TS through raw export and merging without stripping twice', async () => {
        const source = '\uFEFFexport function choose(value: number) { return value ? 1 : 0; }\nchoose(1);\n';
        const filename = write('subject.ts', source);
        const dir = collect(filename);
        const coverage = reporter({
            reports: ['v8-json', ['raw', {
                merge: true
            }]]
        });
        await coverage.addFromDir(dir);
        const first = await generate(coverage);
        fs.rmSync(dir, {
            recursive: true
        });
        fs.unlinkSync(filename);
        const rawDir = path.join(root, 'report/raw');
        const rawData = fs.readdirSync(rawDir).filter((name) => name.startsWith('coverage-')).map((name) => {
            return JSON.parse(fs.readFileSync(path.join(rawDir, name), 'utf8'));
        });
        assert.equal(rawData.length, 1);
        assert.equal(rawData[0].data[0].nativeTypeScript, true);
        assert.equal(Object.hasOwn(rawData[0].data[0], 'hasBOM'), false);
        const rawSource = fs.readdirSync(rawDir).filter((name) => name.startsWith('source-')).map((name) => {
            return JSON.parse(fs.readFileSync(path.join(rawDir, name), 'utf8'));
        });
        assert.equal(rawSource.length, 1);
        assert.equal(rawSource[0].source, stripTypeScriptTypes(source));
        assert.deepEqual(rawSource[0].sourceMap.sourcesContent, [source]);
        assert.equal(first.source, source);
        const merged = await generate(reporter({
            inputDir: rawDir, outputDir: path.join(root, 'merged')
        }));
        assert.equal(merged.nativeTypeScript, true);
        assert.equal(Object.hasOwn(merged, 'hasBOM'), false);
        assert.equal(merged.source, first.source);
        assert.deepEqual(merged.summary, first.summary);
        assert.deepEqual(merged.data, first.data);
        const combined = await generate(reporter({
            inputDir: [rawDir, rawDir], outputDir: path.join(root, 'combined')
        }));
        assert.equal(combined.nativeTypeScript, true);
        assert.equal(Object.hasOwn(combined, 'hasBOM'), false);
        assert.equal(combined.source, first.source);
        assert.equal(combined.data.functions.find((fn) => fn.name === 'choose').count, 2);
    });

    it('keeps distinct original TS coordinates with and without a BOM', async () => {
        const source = 'export function choose(value: number) { return value ? 1 : 0; }\nchoose(1);\n';
        const filename = write('subject.ts', source);
        const withoutBOM = collect(filename, 'without-bom');
        fs.writeFileSync(filename, `\uFEFF${source}`);
        const withBOM = collect(filename, 'with-bom');
        const coverage = reporter();
        await coverage.addFromDir(withoutBOM);
        const sourceFiles = () => fs.readdirSync(coverage.options.cacheDir).filter((name) => name.startsWith('source-'));
        const firstSources = sourceFiles();
        assert.equal(firstSources.length, 1);
        await coverage.addFromDir(withBOM);
        assert.equal(sourceFiles().length, 2);
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [source, `\uFEFF${source}`].sort());
        for (const file of result.files) {
            assert.equal(file.nativeTypeScript, true);
            const fn = file.data.functions.find((item) => item.name === 'choose');
            assert.equal(fn.count, 1);
            assert.equal(fn.start, file.source.indexOf('function choose'));
        }
    });

    it('does not apply original TS sourcemap comments to native stripped JS', async () => {
        const map = Buffer.from(JSON.stringify({
            version: 3, sources: ['wrong.ts'], sourcesContent: ['throw new Error();'], names: [], mappings: 'AAAA'
        })).toString('base64');
        const source = `export const value: number = 1;\n//# sourceMappingURL=data:application/json;base64,${map}\n`;
        const dir = collect(write('subject.ts', source));
        const coverage = reporter();
        await coverage.addFromDir(dir);
        const file = await generate(coverage);
        assert.equal(file.sourcePath, 'subject.ts');
        assert.equal(file.source, source);
    });

    it('can report a module containing only erasable types', async () => {
        const source = 'export interface Info { label: string; }\nexport type Id = string | number;\n';
        const dir = collect(write('subject.ts', source));
        const coverage = reporter();
        await coverage.addFromDir(dir);
        const file = await generate(coverage);
        assert.equal(file.summary.functions.total, 0);
        assert.equal(file.summary.statements.total, 0);
        assert.equal(file.source, source);
    });

    ['node', 'test'].forEach((command) => {
        it(`keeps a failing ${command} command nonzero while generating a TS report`, () => {
            write('subject.ts', 'export function choose(value: number) { return value ? 1 : 0; }\n');
            const code = `
                import { choose } from './subject.ts';
                choose(1);
                throw new Error('native TS failure');
            `;
            const entry = write('failure.test.ts', command === 'test' ? `
                import { test } from 'node:test';
                test('failure', async () => { await import('./failure.ts'); });
            ` : code);
            if (command === 'test') {
                write('failure.ts', code);
            }
            write('mcr.config.cjs', `module.exports = {
                outputDir: './report', reports: ['v8-json'],
                entryFilter: (entry) => entry.url.endsWith('/subject.ts')
            };`);
            const child = run([cli, command, entry]);
            assert.notEqual(child.status, 0, child.stdout + child.stderr);
            assert.match(child.stdout + child.stderr, /native TS failure/);
            const report = JSON.parse(fs.readFileSync(path.join(root, 'report/coverage-report.json'), 'utf8'));
            assert.equal(report.files.length, 1);
            assert.equal(report.files[0].nativeTypeScript, true);
        });
    });
});
