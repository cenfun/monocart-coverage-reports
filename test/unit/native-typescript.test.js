import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encode } from '@jridgewell/sourcemap-codec';
import { MCR } from '../../lib/index.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';
import { createTempRoot } from './unit-utils.js';

const register = import.meta.resolve('monocart-coverage-reports/register');
const cli = fileURLToPath(import.meta.resolve('../../lib/cli.js'));
const source = `// Unicode before coverage ranges: 中文 🚀
import type { Missing } from './not-loaded.ts';
export interface Options {
    enabled: boolean;
}
export type Value = number | string;
export namespace Types {
    export type Name = string;
}

export function choose<T extends number>(value: T): string {
    if (value > 0) {
        return 'positive';
    } else {
        return 'other';
    }
}
export function unused(value: number): number {
    return value * 2;
}
const options = { enabled: true } satisfies Options;
choose(options.enabled ? 1 : 0);
`;

const classSource = `class Counter {
    declare hidden: number;
    readonly step: number = 1;
    value: number = 0;
    inc = (amount: number): number => this.value += amount;
}
const counter = new Counter();
counter.inc(2 as number);
`;

const lineOf = (text, content) => text.slice(0, text.indexOf(content)).split('\n').length;

const run = (args, cwd, coverageDir) => {
    const env = {
        ... process.env
    };
    delete env.NODE_TEST_CONTEXT;
    if (coverageDir) {
        env.NODE_V8_COVERAGE = coverageDir;
    } else {
        delete env.NODE_V8_COVERAGE;
    }
    const result = spawnSync(process.execPath, args, {
        cwd, env, encoding: 'utf8', timeout: 30000
    });
    assert.ifError(result.error);
    return result;
};

const mergeRaw = (inputDir, outputDir) => MCR({
    logging: 'off', inputDir: path.join(inputDir, 'raw'), outputDir, reports: ['v8-json', 'lcovonly']
}).generate();

describe('native TypeScript coverage', {
    timeout: 120000
}, () => {
    let root;
    let serial;

    beforeEach(() => {
        root = createTempRoot('mcr-native-ts-');
        serial = 0;
        fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
    });

    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    const collect = (text, name = 'subject.ts', capture = true, sourceURL = false) => {
        const dir = path.join(root, `input-${serial++}`);
        fs.mkdirSync(dir);
        const file = path.join(dir, name);
        const coverageDir = path.join(dir, 'coverage');
        fs.writeFileSync(file, sourceURL ? `${text}\n//# sourceURL=${pathToFileURL(file).href}\n` : text);
        const child = run([... (capture ? ['--import', register] : []), file], root, coverageDir);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        return {
            dir, file, coverageDir, name
        };
    };

    const report = async (input, extra = {}) => {
        const outputDir = path.join(root, `report-${serial++}`);
        const mcr = MCR({
            logging: 'off',
            baseDir: input.dir,
            outputDir,
            reports: ['v8-json', 'json', 'lcovonly', 'raw'],
            entryFilter: (entry) => entry.url.endsWith(`/${input.name}`),
            ... extra
        });
        await mcr.addFromDir(input.coverageDir);
        const result = await mcr.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        return {
            result, file: result.files[0], outputDir
        };
    };

    const javascriptReport = (text) => report(collect(text, 'subject.mjs', true, true), {
        // Node appends sourceURL when stripping TS. Execute the JS reference
        // with that suffix too, but analyze only the same original source span.
        onEntry: (entry) => {
            entry.source = text;
        }
    });

    it('matches executed JavaScript coverage without counting types as statements or lines', async () => {
        const native = await report(collect(source));
        const stripped = stripTypeScriptTypes(source, {
            mode: 'strip'
        });
        const javascript = await javascriptReport(stripped);
        assert.equal(native.file.source, source);
        assert.deepEqual(native.file.summary, javascript.file.summary);
        assert.deepEqual(native.file.data, javascript.file.data);
        assert.equal(native.file.summary.functions.total, 2);
        assert.equal(native.file.summary.functions.covered, 1);
        assert.equal(native.file.data.functions.find((fn) => fn.name === 'choose').count, 1);
        assert.equal(native.file.data.functions.find((fn) => fn.name === 'unused').count, 0);
        assert.equal(native.file.data.lines[lineOf(source, "return 'other'")], 0);
        assert.equal(native.file.data.lines[lineOf(source, 'return value * 2')], 0);
        for (const text of ['import type', 'export interface', 'enabled: boolean', 'export type', 'export namespace', 'export type Name']) {
            assert.equal(Object.hasOwn(native.file.data.lines, lineOf(source, text)), false, text);
        }
        const istanbul = JSON.parse(fs.readFileSync(path.join(native.outputDir, 'coverage-final.json'), 'utf8'));
        const jsIstanbul = JSON.parse(fs.readFileSync(path.join(javascript.outputDir, 'coverage-final.json'), 'utf8'));
        const { path: tsPath, ... tsCoverage } = Object.values(istanbul)[0];
        const { path: jsPath, ... jsCoverage } = Object.values(jsIstanbul)[0];
        assert.notEqual(tsPath, jsPath);
        assert.deepEqual(tsCoverage, jsCoverage);
        assert.match(fs.readFileSync(path.join(native.outputDir, 'lcov.info'), 'utf8'), new RegExp(`DA:${lineOf(source, "return 'other'")},0`));
    });

    it('uses native class field semantics after erasing declare, readonly and arrow types', async () => {
        const text = classSource;
        const native = await report(collect(text));
        const javascript = await javascriptReport(stripTypeScriptTypes(text));
        assert.equal(native.file.source, text);
        assert.deepEqual(native.file.summary, javascript.file.summary);
        assert.deepEqual(native.file.data, javascript.file.data);
        assert.equal(native.file.summary.functions.total, 1);
        assert.equal(native.file.summary.functions.covered, 1);
        assert.equal(Object.hasOwn(native.file.data.lines, 2), false);
    });

    for (const extension of ['ts', 'mts', 'cts']) {
        it(`captures the executed .${extension} source without sourcemaps`, async () => {
            const text = extension === 'cts' ? 'function choose(value: number): number { return value ? 1 : 0; }\nmodule.exports = choose(1);\n' : 'export function choose(value: number): number { return value ? 1 : 0; }\nchoose(1);\n';
            const input = collect(text, `subject.${extension}`);
            // Reporting must not depend on reading a newer version from disk.
            fs.writeFileSync(input.file, 'throw new Error("changed after execution");\n');
            const { file } = await report(input, {
                sourcePath: () => 'renamed/source.js'
            });
            assert.equal(file.sourcePath, 'renamed/source.js');
            assert.equal(file.source, text);
            assert.equal(file.summary.functions.total, 1);
            assert.equal(file.summary.functions.covered, 1);
            assert.equal(file.summary.branches.total, 2);
            assert.equal(file.summary.branches.covered, 1);
            assert.equal(file.data.functions[0].count, 1);
            assert.equal(file.summary.bytes.total, text.length);
            for (const range of file.data.bytes) {
                assert.ok(range.start >= 0 && range.end <= text.length);
            }
        });
    }

    it('keeps mapped runtime JS separate from native TS, even with a .ts execution URL', async () => {
        // A loader may provide JS whose V8 positions already include its BOM.
        const text = '\uFEFFfunction pick() { return 1; }\npick();\n';
        const functions = [{
            functionName: '',
            isBlockCoverage: true,
            ranges: [{
                startOffset: 0, endOffset: text.length, count: 1
            }]
        }, {
            functionName: 'pick',
            isBlockCoverage: true,
            ranges: [{
                startOffset: 1, endOffset: text.indexOf('}') + 1, count: 1
            }]
        }];
        const convert = (extension) => convertV8List([{
            id: 'mapped',
            type: 'js',
            sourcePath: `runtime.${extension}`,
            url: `file:///runtime.${extension}`,
            source: text,
            functions: structuredClone(functions),
            sourceMap: {
                version: 3,
                names: [],
                sources: ['original.ts'],
                sourcesContent: [text],
                mappings: encode(text.split('\n').map((line, index) => Array.from({
                    length: line.length
                }, (_, column) => [column, 0, index, column])))
            }
        }], {
            ... defaultOptions, logging: 'off'
        });
        const js = await convert('js');
        const ts = await convert('ts');
        assert.equal(ts.v8DataList[0].source, text);
        assert.equal(ts.v8DataList[0].summary.functions.total, 1);
        assert.deepEqual(ts.v8DataList[0].summary, js.v8DataList[0].summary);
        assert.deepEqual(ts.v8DataList[0].data, js.v8DataList[0].data);
        assert.deepEqual(ts.coverageData, js.coverageData);
    });

    it('supports NODE_V8_COVERAGE input without the MCR preload when explicitly enabled', async () => {
        const { file } = await report(collect(source, 'subject.ts', false), {
            typescript: true
        });
        assert.equal(file.source, source);
        assert.equal(file.summary.functions.covered, 1);
        assert.equal(Object.hasOwn(file.data.lines, lineOf(source, 'export interface')), false);
    });

    it('preserves CRLF, BOM, Unicode and overload offsets', async () => {
        const text = `\uFEFF// 中文 🚀
export function length(value: string): number;
export function length(value: string | null): number {
    return value === null ? 0 : value.length;
}
length('你好');
`.replaceAll('\n', '\r\n');
        const native = await report(collect(text));
        // Use a space instead of BOM so the JS loader does not remove it too.
        const javascript = await javascriptReport(` ${stripTypeScriptTypes(text)}`);
        assert.equal(native.file.source, text);
        assert.deepEqual(native.file.summary, javascript.file.summary);
        assert.deepEqual(native.file.data, javascript.file.data);
        assert.equal(native.file.summary.functions.total, 1);
        assert.equal(native.file.summary.branches.covered, 1);
        assert.equal(Object.hasOwn(native.file.data.lines, 2), false);
        const merged = await mergeRaw(native.outputDir, path.join(root, 'merged-bom'));
        assert.ok(merged);
        assert.equal(merged.files[0].source, text);
        assert.deepEqual(merged.files[0].data, native.file.data);
    });

    it('merges complementary executions of the same native TS source', async () => {
        const text = source.replace('choose(options.enabled ? 1 : 0);', 'choose(Number(process.argv[2] || 1));');
        const input = collect(text);
        const child = run(['--import', register, input.file, '-1'], root, input.coverageDir);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        const { file } = await report(input);
        assert.equal(file.source, text);
        assert.equal(file.data.functions.find((fn) => fn.name === 'choose').count, 2);
        assert.equal(file.data.functions.find((fn) => fn.name === 'unused').count, 0);
        assert.equal(file.summary.branches.total, 4);
        assert.equal(file.summary.branches.covered, 4);
    });

    it('round-trips native TS through raw reports without losing source or coverage', async () => {
        const original = await report(collect(source));
        const merged = await mergeRaw(original.outputDir, path.join(root, 'merged'));
        assert.ok(merged);
        assert.equal(merged.files.length, 1);
        assert.equal(merged.files[0].source, source);
        assert.deepEqual(merged.files[0].summary, original.file.summary);
        assert.deepEqual(merged.files[0].data, original.file.data);
    });

    it('analyzes untested TS and type-only files without a transformer', async () => {
        const text = `\uFEFF${source}`;
        fs.writeFileSync(path.join(root, 'unused.ts'), text);
        fs.writeFileSync(path.join(root, 'types.ts'), 'export interface User { name: string; }\nexport type Id = number;\n');
        const loaded = collect('export const loaded: number = 1;\n', 'loaded.ts');
        const coverageReport = MCR({
            logging: 'off',
            baseDir: root,
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json', 'json', 'raw'],
            entryFilter: (entry) => entry.url.endsWith('/loaded.ts'),
            all: {
                dir: root, filter: (file) => file.endsWith('.ts')
            }
        });
        await coverageReport.addFromDir(loaded.coverageDir);
        const result = await coverageReport.generate();
        assert.ok(result);
        assert.equal(result.files.length, 3);
        const executed = result.files.find((file) => file.sourcePath.endsWith('/loaded.ts'));
        assert.equal(executed.summary.statements.covered, executed.summary.statements.total);
        const unused = result.files.find((file) => file.sourcePath === 'unused.ts');
        assert.equal(unused.source, text);
        assert.equal(unused.data.functions[0].start, text.indexOf('function choose'));
        assert.equal(unused.summary.functions.total, 2);
        assert.equal(unused.summary.branches.total, 4);
        for (const metric of ['functions', 'branches', 'statements', 'lines', 'bytes']) {
            assert.equal(unused.summary[metric].covered, 0, metric);
        }
        const types = result.files.find((file) => file.sourcePath === 'types.ts');
        assert.equal(types.source, fs.readFileSync(path.join(root, 'types.ts'), 'utf8'));
        for (const metric of ['functions', 'branches', 'statements', 'lines']) {
            assert.equal(types.summary[metric].total, 0, metric);
        }
        const merged = await mergeRaw(path.join(root, 'reports'), path.join(root, 'merged'));
        assert.ok(merged);
        assert.deepEqual(merged.summary, result.summary);
        for (const original of result.files) {
            const file = merged.files.find((entry) => entry.sourcePath === original.sourcePath);
            assert.equal(file.source, original.source);
            assert.deepEqual(file.data, original.data);
        }
    });

    const checkCliFailure = (command) => {
        fs.writeFileSync(path.join(root, 'subject.ts'), source);
        fs.writeFileSync(path.join(root, 'mcr.config.ts'), `export default {
                reports: ['v8-json'], outputDir: './reports',
                entryFilter: (entry: { url: string }) => entry.url.endsWith('/subject.ts')
            };\n`);
        const target = command === 'test' ? 'sample.test.ts' : 'run.ts';
        const code = command === 'test' ? "import { test } from 'node:test'; import './subject.ts'; test('fails', () => { throw new Error('expected failure'); });\n" : "import './subject.ts'; process.exitCode = 7;\n";
        fs.writeFileSync(path.join(root, target), code);
        const args = command === 'test' ? ['test', '*.test.ts'] : [process.execPath, target];
        const child = run([cli, ... args], root);
        assert.equal(child.status, command === 'test' ? 1 : 7, child.stdout + child.stderr);
        const data = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-report.json'), 'utf8'));
        assert.equal(data.files.length, 1);
        assert.equal(data.files[0].source, source);
        assert.equal(data.files[0].summary.functions.covered, 1);
        assert.doesNotMatch(child.stdout + child.stderr, /Unparsable source/);
    };

    for (const command of ['node', 'test']) {
        it(`runs native TS with mcr ${command}, loads TS config and preserves failures`, () => checkCliFailure(command));
    }
});
