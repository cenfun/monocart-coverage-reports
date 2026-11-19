import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { convertV8List } from '../../lib/converter/converter.js';
import { getJsAstInfo } from '../../lib/converter/ast.js';
import { defaultOptions } from '../../lib/default/options.js';
import { MCR } from '../../lib/index.js';
import { createTempRoot } from './unit-utils.js';

// Collect actual V8 ranges for JS supplied by a loader/VM, without assuming
// that a .ts execution URL describes the syntax or the module wrapper.
const collect = (source) => {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import vm from 'node:vm';
        import { Session } from 'node:inspector/promises';
        const session = new Session();
        session.connect();
        try {
            await session.post('Profiler.enable');
            await session.post('Profiler.startPreciseCoverage', {callCount:true, detailed:true});
            vm.compileFunction(${JSON.stringify(source)}, [], {filename:'runtime.ts'})();
            const { result } = await session.post('Profiler.takePreciseCoverage');
            const entry = result.find((item) => item.url === 'runtime.ts');
            if (!entry) throw new Error('Missing VM coverage');
            process.stdout.write(JSON.stringify(entry.functions));
        } finally {
            session.disconnect();
        }
    `], {
        encoding: 'utf8', timeout: 10000
    });
    assert.ifError(child.error);
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout);
};

const convert = (source, functions, extension) => convertV8List([{
    id: 'runtime',
    type: 'js',
    sourcePath: `runtime.${extension}`,
    url: `file:///runtime.${extension}`,
    source,
    functions: structuredClone(functions)
}], {
    ... defaultOptions, logging: 'off'
});

describe('TypeScript compatibility boundaries', () => {
    const cases = [{
        name: 'CommonJS top-level return', source: 'function pick() { return 1; }\nreturn pick();\n'
    }, {
        name: 'sloppy-mode with statement', source: 'var result;\nwith ({ value: 1 }) { result = value; }\n'
    }, {
        name: 'legacy octal literal', source: 'var result = 010;\n'
    }, {
        name: 'runtime JS with a BOM', source: '\uFEFFfunction pick() { return 1; }\npick();\n'
    }];

    for (const fixture of cases) {
        it(`does not reinterpret ${fixture.name} as TS based on its URL`, async () => {
            const functions = collect(fixture.source);
            const js = await convert(fixture.source, functions, 'js');
            const ts = await convert(fixture.source, functions, 'ts');
            assert.equal(ts.v8DataList[0].source, fixture.source);
            assert.deepEqual(ts.v8DataList[0].summary, js.v8DataList[0].summary);
            assert.deepEqual(ts.v8DataList[0].data, js.v8DataList[0].data);
            const { path: tsPath, ... tsData } = ts.coverageData['runtime.ts'];
            const { path: jsPath, ... jsData } = js.coverageData['runtime.js'];
            assert.notEqual(tsPath, jsPath);
            assert.deepEqual(tsData, jsData);
        });
    }

    it('does not move the same BOM coverage ranges on repeated AST analysis', () => {
        const source = '\uFEFFfunction unused(value: number): number { return value; }\n';
        const functions = collect(stripTypeScriptTypes(source));
        const spans = () => functions.map((block) => block.ranges.map(({
            startOffset, endOffset, count
        }) => ({
            startOffset, endOffset, count
        })));
        const original = spans();
        const item = {
            source, url: 'file:///subject.ts', sourcePath: 'subject.ts', nativeTypeScript: true
        };
        const first = getJsAstInfo(item, functions);
        const second = getJsAstInfo(item, functions);
        assert.equal(first.functions[0].count, 0);
        assert.deepEqual(second.functions, first.functions);
        assert.deepEqual(spans(), original);
    });

    it('retains errors for invalid sources explicitly identified as native TS', async () => {
        const root = createTempRoot('mcr-native-ts-invalid-');
        try {
            const source = 'export enum Color { Red, Blue }\n';
            const report = MCR({
                logging: 'off', outputDir: path.join(root, 'reports'), reports: ['v8-json']
            });
            await report.add([{
                url: 'file:///enum.ts',
                source,
                nativeTypeScript: true,
                functions: [{
                    functionName: '',
                    isBlockCoverage: true,
                    ranges: [{
                        startOffset: 0, endOffset: source.length, count: 1
                    }]
                }]
            }]);
            await assert.rejects(report.generate(), (error) => {
                assert.match(error.message, /Cannot analyze TypeScript in .*enum\.ts/);
                assert.equal(error.cause.code, 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX');
                return true;
            });
            assert.equal(fs.existsSync(path.join(root, 'reports/coverage-report.json')), false);
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });

    it('retains native BOM-only JS source identity through capture and raw merging', async () => {
        const root = createTempRoot('mcr-native-ts-bom-');
        try {
            const source = '\uFEFFfunction unused() { return 1; }\nexport {};\n';
            const file = path.join(root, 'subject.ts');
            const coverageDir = path.join(root, 'coverage');
            fs.writeFileSync(file, source);
            const child = spawnSync(process.execPath, [
                '--import', import.meta.resolve('monocart-coverage-reports/register'), file
            ], {
                env: {
                    ... process.env, NODE_V8_COVERAGE: coverageDir
                },
                encoding: 'utf8',
                timeout: 10000
            });
            assert.ifError(child.error);
            assert.equal(child.status, 0, child.stderr);
            fs.writeFileSync(file, 'throw new Error("changed source");');
            const outputDir = path.join(root, 'reports');
            const report = MCR({
                logging: 'off',
                outputDir,
                reports: ['v8-json', 'raw'],
                entryFilter: (entry) => entry.url.endsWith('/subject.ts')
            });
            await report.addFromDir(coverageDir);
            const result = await report.generate();
            assert.ok(result);
            assert.equal(result.files.length, 1);
            assert.equal(result.files[0].source, source);
            assert.equal(result.files[0].data.functions[0].start, 1);
            assert.equal(result.files[0].data.functions[0].count, 0);
            const merged = await MCR({
                logging: 'off',
                inputDir: path.join(outputDir, 'raw'),
                outputDir: path.join(root, 'merged'),
                reports: ['v8-json']
            }).generate();
            assert.ok(merged);
            assert.deepEqual(merged.files[0].summary, result.files[0].summary);
            assert.deepEqual(merged.files[0].data, result.files[0].data);
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });

    it('keeps the existing tsx loader and sourcemap workflow for non-erasable TS', () => {
        const root = createTempRoot('mcr-tsx-compat-');
        try {
            const source = `export enum Mode { Ready, Waiting }
export function choose(active: boolean): Mode {
    return active ? Mode.Ready : Mode.Waiting;
}
export function unused(): number { return 42; }
`;
            fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
            fs.writeFileSync(path.join(root, 'subject.ts'), source);
            fs.writeFileSync(path.join(root, 'run.ts'), "import { choose } from './subject.ts'; choose(true);\n");
            fs.writeFileSync(path.join(root, 'mcr.config.cjs'), `module.exports = {
                reports: ['v8-json'], outputDir: './reports',
                entryFilter: (entry) => entry.url.endsWith('/subject.ts')
            };\n`);
            const env = {
                ... process.env
            };
            delete env.NODE_TEST_CONTEXT;
            delete env.NODE_V8_COVERAGE;
            const child = spawnSync(process.execPath, [
                fileURLToPath(import.meta.resolve('../../lib/cli.js')),
                '--import',
                'tsx',
                process.execPath,
                'run.ts'
            ], {
                cwd: root, env, encoding: 'utf8', timeout: 30000
            });
            assert.ifError(child.error);
            assert.equal(child.status, 0, child.stdout + child.stderr);
            const result = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-report.json'), 'utf8'));
            assert.equal(result.files.length, 1);
            const [file] = result.files;
            assert.equal(file.source, source);
            assert.equal(file.data.functions.find((fn) => fn.name === 'choose').count, 1);
            assert.equal(file.data.functions.find((fn) => fn.name === 'unused').count, 0);
            assert.equal(Object.hasOwn(file, 'nativeTypeScript'), false);
            assert.doesNotMatch(child.stdout + child.stderr, /Cannot analyze TypeScript|Unparsable source/);
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });

    it('preserves explicit all transformers even when native TS execution was collected', async () => {
        const root = createTempRoot('mcr-ts-transformer-');
        try {
            fs.writeFileSync(path.join(root, 'unused.ts'), 'export interface Options { value: number; }\n');
            const report = MCR({
                logging: 'off',
                outputDir: path.join(root, 'reports'),
                reports: ['v8-json'],
                all: {
                    dir: root,
                    filter: (file) => file.endsWith('.ts'),
                    transformer: (entry) => {
                        entry.source = 'return 42;\n';
                    }
                }
            });
            const source = 'export const loaded = 1;\n';
            await report.add([{
                url: 'file:///loaded.ts',
                source,
                nativeTypeScript: true,
                functions: [{
                    functionName: '',
                    isBlockCoverage: true,
                    ranges: [{
                        startOffset: 0, endOffset: source.length, count: 1
                    }]
                }]
            }]);
            const result = await report.generate();
            assert.ok(result);
            assert.equal(result.files.length, 2);
            const file = result.files.find((entry) => entry.sourcePath.endsWith('/unused.ts'));
            assert.equal(file.source, 'return 42;\n');
            assert.equal(Object.hasOwn(file, 'nativeTypeScript'), false);
            assert.equal(file.summary.statements.total, 1);
            assert.equal(file.summary.statements.covered, 0);
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });

    it('retains legacy untested TS metrics without a collected native TS context', async () => {
        const root = createTempRoot('mcr-ts-compat-');
        try {
            fs.writeFileSync(path.join(root, 'enum.ts'), 'export enum Color { Red, Blue }\n');
            fs.writeFileSync(path.join(root, 'erasable.ts'), 'export interface Options { value: number; }\nexport function unused(value: number): number { return value; }\n');
            const result = await MCR({
                logging: 'off',
                baseDir: root,
                outputDir: path.join(root, 'reports'),
                all: {
                    dir: root, filter: (file) => file.endsWith('.ts')
                },
                reports: ['v8-json']
            }).generate();
            assert.ok(result);
            assert.equal(result.files.length, 2);
            for (const file of result.files) {
                assert.equal(file.empty, true);
                assert.equal(Object.hasOwn(file, 'nativeTypeScript'), false);
                assert.equal(file.data.lines[1], 0, 'legacy type lines keep their existing classification');
                assert.equal(file.summary.bytes.covered, 0);
                assert.equal(file.summary.lines.covered, 0);
                assert.equal(file.summary.bytes.total, file.source.length);
                for (const metric of ['functions', 'branches', 'statements']) {
                    assert.equal(file.summary[metric].total, 0, metric);
                }
            }
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });
});
