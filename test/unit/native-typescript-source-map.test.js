import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { encode } from '@jridgewell/sourcemap-codec';
import { MCR } from '../../lib/index.js';

describe('native TypeScript source map integration', {
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

    it('does not share cached maps for different TS originals that strip to identical JS', async () => {
        const first = 'export function choose(value: number) { return value ? 1 : 0; }\nchoose(1);\n';
        const second = first.replace('number', 'string');
        assert.equal(stripTypeScriptTypes(first), stripTypeScriptTypes(second));
        const filename = write('subject.ts', first);
        const firstDir = collect(filename, 'first');
        fs.writeFileSync(filename, second);
        const secondDir = collect(filename, 'second');
        const coverage = reporter();
        await coverage.addFromDir(firstDir);
        await coverage.addFromDir(secondDir);
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [first, second].sort());
        for (const file of result.files) {
            assert.equal(file.data.functions.find((fn) => fn.name === 'choose').count, 1);
        }
    });

    const mappingCases = [
        `type Id = number; const label = '${'中文🚀'.repeat(50)}'; const pick = <T,>(value: T): T => value; const choose = (value: number): number => value > 0 ? pick(value) : 0; choose(1);`,
        '\uFEFF#!/usr/bin/env node\r\ninterface Info { label: string; }\r\nfunction choose(\r\n value: number\r\n): number {\r\n return value > 0 ? value : 0;\r\n}\r\nchoose(1);\r\n',
        'type Info = {\n value: number;\n};\nconst value = (1 satisfies number) as number;\nconst choose = (input?: { value: number }) => input?.value ?? value;\nchoose();\n'
    ];
    mappingCases.forEach((source, index) => {
        it(`matches dense source mappings for runtime ranges (case ${index})`, async () => {
            const dir = collect(write('subject.ts', source));
            const sparseCoverage = reporter({
                outputDir: path.join(root, 'sparse')
            });
            await sparseCoverage.addFromDir(dir);
            const sparse = await generate(sparseCoverage);
            const denseCoverage = reporter({
                outputDir: path.join(root, 'dense'),
                onEntry: (entry) => {
                    const lines = entry.source.split(/\r\n|[\r\n\u2028\u2029]/);
                    entry.sourceMap.mappings = encode(lines.map((line, row) => {
                        const offset = row === 0 && source.startsWith('\uFEFF') ? 1 : 0;
                        return Array.from({
                            length: line.length + 1
                        }, (_, column) => [column, 0, row, column + offset]);
                    }));
                }
            });
            await denseCoverage.addFromDir(dir);
            const dense = await generate(denseCoverage);
            assert.equal(sparse.source, source);
            assert.deepEqual(sparse.summary, dense.summary);
            assert.deepEqual(sparse.data, dense.data);
            assert.ok(sparse.data.functions.length > 0);
            assert.ok(sparse.data.statements.length > 0);
            assert.ok(sparse.data.branches.length > 0);
        });
    });

    it('uses original TS locations and source text for Istanbul reports', async () => {
        const source = '\uFEFFexport function choose(value: number) { return value ? 1 : 0; }\nchoose(1);\n';
        const dir = collect(write('subject.ts', source));
        const coverage = reporter({
            reports: ['v8-json', 'json']
        });
        await coverage.addFromDir(dir);
        const file = await generate(coverage);
        const json = JSON.parse(fs.readFileSync(path.join(root, 'report/coverage-final.json'), 'utf8'));
        const files = Object.values(json);
        assert.equal(files.length, 1);
        const fn = Object.values(files[0].fnMap).find((item) => item.name === 'choose');
        assert.ok(fn);
        assert.equal(fn.loc.start.line, 1);
        assert.equal(fn.decl.start.column, source.indexOf('function choose'));
        assert.equal(fn.loc.start.column, source.indexOf('{'));
        assert.equal(file.source, source);
    });

    it('applies existing source filters and path rewriting to the original TS', async () => {
        const source = 'export function choose(value: number) { return value ? 1 : 0; }\nchoose(1);\n';
        const dir = collect(write('subject.ts', source));
        const paths = [];
        const coverage = reporter({
            sourcePath: () => 'original/subject.ts',
            sourceFilter: (sourcePath) => {
                paths.push(sourcePath);
                return true;
            }
        });
        await coverage.addFromDir(dir);
        const file = await generate(coverage);
        assert.deepEqual(paths, ['original/subject.ts']);
        assert.equal(file.sourcePath, 'original/subject.ts');
        assert.equal(file.source, source);
        const excluded = reporter({
            outputDir: path.join(root, 'excluded'), sourceFilter: () => false
        });
        await excluded.addFromDir(dir);
        const result = await excluded.generate();
        assert.ok(result);
        assert.equal(result.files.length, 0);
    });

    it('keeps ordinary JS source identities and coverage unchanged beside native TS', async () => {
        write('subject.js', 'export function plain(value) { return value ? 1 : 0; }\nplain(1);\n');
        write('subject.ts', 'export function typed(value: number) { return value ? 1 : 0; }\ntyped(1);\n');
        const jsDir = collect(path.join(root, 'subject.js'), 'js-only');
        const mixedDir = collect(write('entry.mjs', "import './subject.js';\nimport './subject.ts';\n"), 'mixed');
        const plainCoverage = reporter({
            outputDir: path.join(root, 'plain')
        });
        await plainCoverage.addFromDir(jsDir);
        const plain = await generate(plainCoverage);
        const mixedCoverage = reporter({
            outputDir: path.join(root, 'mixed-report')
        });
        await mixedCoverage.addFromDir(mixedDir);
        const mixed = await mixedCoverage.generate();
        assert.ok(mixed);
        assert.equal(mixed.files.length, 2);
        const js = mixed.files.find((file) => file.sourcePath === 'subject.js');
        assert.ok(js);
        assert.equal(Object.hasOwn(js, 'nativeTypeScript'), false);
        assert.equal(js.id, plain.id);
        assert.equal(js.source, plain.source);
        assert.deepEqual(js.summary, plain.summary);
        assert.deepEqual(js.data, plain.data);
    });

});
