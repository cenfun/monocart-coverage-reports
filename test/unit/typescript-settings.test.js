import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { MCR } from '../../lib/index.js';
import { createTempRoot } from './unit-utils.js';

const source = 'interface Options {\n    value: number;\n}\nconst value: number = 1;\n';
const cli = fileURLToPath(import.meta.resolve('../../lib/cli.js'));
const hasTypeAnalysis = (file) => !Object.hasOwn(file.data.lines, 1);

const entry = (root, name, nativeTypeScript = false) => {
    const item = {
        url: pathToFileURL(path.join(root, name)).href,
        source,
        functions: [{
            functionName: '',
            isBlockCoverage: true,
            ranges: [{
                startOffset: 0, endOffset: source.length, count: 1
            }]
        }]
    };
    if (nativeTypeScript) {
        item.nativeTypeScript = true;
    }
    return item;
};

const runCLI = (root, args) => {
    const env = {
        ... process.env
    };
    delete env.NODE_TEST_CONTEXT;
    delete env.NODE_V8_COVERAGE;
    const child = spawnSync(process.execPath, [cli, ... args], {
        cwd: root, env, encoding: 'utf8', timeout: 30000
    });
    assert.ifError(child.error);
    return child;
};

describe('TypeScript settings in report generation', () => {
    let root;
    let serial;
    beforeEach(() => {
        root = createTempRoot('mcr-typescript-settings-');
        serial = 0;
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const generate = async (typescript, nativeTypeScript = false, extra = {}) => {
        const outputDir = path.join(root, `report-${serial++}`);
        const report = MCR({
            logging: 'off',
            baseDir: root,
            outputDir,
            typescript,
            reports: ['v8-json', 'raw'],
            ... extra
        });
        await report.add([entry(root, 'subject.ts', nativeTypeScript)]);
        const result = await report.generate();
        assert.ok(result);
        return {
            result, outputDir
        };
    };

    it('auto is conservative while true and false override the loaded identity', async () => {
        for (const native of [true, false]) {
            for (const setting of [null, {}, true, false, {
                enabled: true
            }, {
                enabled: false
            }]) {
                const { result } = await generate(setting, native);
                const expected = typeof setting === 'boolean' ? setting : setting?.enabled ?? native;
                const [file] = result.files;
                assert.equal(hasTypeAnalysis(file), expected);
                assert.equal(file.source, source);
                assert.equal(file.nativeTypeScript === true, native);
            }
        }
    });

    it('calls file callbacks once after filtering and merging, including all entries without claiming they loaded', async () => {
        fs.writeFileSync(path.join(root, 'unused.ts'), source);
        const calls = [];
        const report = MCR({
            logging: 'off',
            baseDir: root,
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json'],
            entryFilter: (item) => !item.url.endsWith('/excluded.ts'),
            typescript: (info) => {
                calls.push(info);
                return {
                    enabled: !info.sourcePath.endsWith('disabled.ts')
                };
            },
            all: {
                dir: root, filter: (file) => file.endsWith('/unused.ts') || file.endsWith('\\unused.ts')
            }
        });
        await report.add([
            entry(root, 'native.ts', true),
            entry(root, 'native.ts', true),
            entry(root, 'disabled.ts', true),
            entry(root, 'unknown.mts'),
            entry(root, 'excluded.ts', true)
        ]);
        const result = await report.generate();
        assert.ok(result);
        assert.equal(result.files.length, 4);
        assert.equal(calls.length, 4);
        assert.equal(new Set(calls.map((info) => info.sourcePath)).size, 4);
        const unusedInfo = calls.find((info) => info.empty);
        assert.equal(unusedInfo.sourcePath, 'unused.ts');
        assert.equal(unusedInfo.nativeTypeScript, false);
        const unused = result.files.find((file) => file.sourcePath === 'unused.ts');
        assert.equal(Object.hasOwn(unused, 'nativeTypeScript'), false);
        assert.equal(Object.hasOwn(unused, 'nativeTypeScriptContext'), false);
        assert.equal(hasTypeAnalysis(unused), true);
        assert.equal(unused.summary.statements.covered, 0);
        assert.equal(hasTypeAnalysis(result.files.find((file) => file.sourcePath === 'disabled.ts')), false);
    });

    it('can explicitly analyze all-only reports using booleans or either callback form', async () => {
        fs.writeFileSync(path.join(root, 'unused.ts'), source);
        const settings = [true, {
            enabled: true
        }, () => true, {
            enabled: (info) => info.empty
        }];
        for (const typescript of settings) {
            const result = await MCR({
                logging: 'off',
                baseDir: root,
                outputDir: path.join(root, `all-${serial++}`),
                reports: ['v8-json'],
                typescript,
                all: {
                    dir: root, filter: (file) => file.endsWith('.ts')
                }
            }).generate();
            assert.ok(result);
            const [file] = result.files;
            assert.equal(hasTypeAnalysis(file), true);
            assert.equal(file.summary.statements.total, 1);
            assert.equal(file.summary.statements.covered, 0);
            assert.equal(file.nativeTypeScript === true, false);
        }
    });

    it('raw keeps loading facts, not a permanent force-on or force-off decision', async () => {
        for (const native of [true, false]) {
            const original = await generate(!native, native);
            for (const typescript of [null, true, false]) {
                const merged = await MCR({
                    logging: 'off',
                    inputDir: path.join(original.outputDir, 'raw'),
                    outputDir: path.join(root, `merged-${serial++}`),
                    reports: ['v8-json'],
                    typescript
                }).generate();
                assert.ok(merged);
                assert.equal(hasTypeAnalysis(merged.files[0]), typescript ?? native);
                assert.equal(merged.files[0].nativeTypeScript === true, native);
            }
        }
    });

    it('keeps untested context distinct from native identity across disabled raw reports', async () => {
        fs.writeFileSync(path.join(root, 'unused.ts'), source);
        const original = await generate(false, true, {
            all: {
                dir: root, filter: (file) => file.endsWith('.ts')
            }
        });
        assert.equal(original.result.files.length, 2);
        const unused = original.result.files.find((file) => file.empty);
        assert.equal(unused.nativeTypeScript === true, false);
        assert.equal(hasTypeAnalysis(unused), false);
        const calls = [];
        const merged = await MCR({
            logging: 'off',
            inputDir: path.join(original.outputDir, 'raw'),
            outputDir: path.join(root, 'merged-context'),
            reports: ['v8-json'],
            typescript: (info) => {
                calls.push(info); return null;
            }
        }).generate();
        assert.ok(merged);
        assert.equal(calls.length, 2);
        assert.equal(calls.find((info) => info.empty).nativeTypeScript, false);
        for (const file of merged.files) {
            assert.equal(hasTypeAnalysis(file), true);
        }
        assert.equal(merged.files.find((file) => file.empty).nativeTypeScript === true, false);
    });

    it('preserves explicit all transformers and their raw identity even when force is requested', async () => {
        fs.writeFileSync(path.join(root, 'unused.ts'), source);
        const outputDir = path.join(root, 'transformed');
        const result = await MCR({
            logging: 'off',
            baseDir: root,
            outputDir,
            reports: ['v8-json', 'raw'],
            typescript: true,
            all: {
                dir: root,
                filter: (file) => file.endsWith('.ts'),
                transformer: (item) => {
                    item.source = 'return 42;\n';
                }
            }
        }).generate();
        assert.ok(result);
        assert.equal(result.files[0].summary.statements.total, 1);
        assert.equal(Object.hasOwn(result.files[0], 'typeScriptTransformed'), false);
        let calls = 0;
        const merged = await MCR({
            logging: 'off',
            inputDir: path.join(outputDir, 'raw'),
            outputDir: path.join(root, 'merged-transformer'),
            reports: ['v8-json'],
            typescript: () => {
                calls += 1; return true;
            }
        }).generate();
        assert.ok(merged);
        assert.equal(calls, 0);
        assert.deepEqual(merged.files[0].data, result.files[0].data);
    });

    it('rejects forced non-erasable all entries instead of pretending they were analyzed', async () => {
        fs.writeFileSync(path.join(root, 'enum.ts'), 'export enum Color { Red, Blue }\n');
        await assert.rejects(MCR({
            logging: 'off',
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json'],
            typescript: true,
            all: {
                dir: root, filter: (file) => file.endsWith('.ts')
            }
        }).generate(), /Cannot analyze TypeScript/);
    });

    it('propagates callback failures without writing a successful report', async () => {
        const outputDir = path.join(root, 'failed');
        await assert.rejects(generate(() => {
            throw new Error('policy failed');
        }, true, {
            outputDir
        }), /policy failed/);
        assert.equal(fs.existsSync(path.join(outputDir, 'coverage-report.json')), false);
    });

    it('CLI merge can disable analysis of native identity saved in raw', async () => {
        const original = await generate(null, true);
        const outputDir = path.join(root, 'merged-cli');
        const child = runCLI(root, ['merge',
                                    '--inputDir',
                                    path.join(original.outputDir, 'raw'),
                                    '--outputDir',
                                    outputDir,
                                    '--reports',
                                    'v8-json',
                                    '--no-typescript']);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        const result = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-report.json'), 'utf8'));
        assert.equal(result.files[0].nativeTypeScript, true);
        assert.equal(hasTypeAnalysis(result.files[0]), false);
    });

    it('CLI retains a nonzero exit status for invalid enabled callback results', () => {
        fs.writeFileSync(path.join(root, 'subject.ts'), `${source}export {};\n`);
        fs.writeFileSync(path.join(root, 'mcr.config.cjs'), `module.exports = {
            typescript: {enabled: () => 1}, reports: ['v8-json'], outputDir: './reports',
            entryFilter: (item) => item.url.endsWith('/subject.ts')
        };`);
        const child = runCLI(root, [process.execPath, 'subject.ts']);
        assert.equal(child.status, 1, child.stdout + child.stderr);
        assert.match(child.stdout + child.stderr, /typescript.enabled callback must return a boolean/);
        assert.equal(fs.existsSync(path.join(root, 'reports/coverage-report.json')), false);
    });

    const runCliCase = (flag, configured, expected) => {
        fs.writeFileSync(path.join(root, 'subject.ts'), `${source}export {};\n`);
        fs.writeFileSync(path.join(root, 'mcr.config.cjs'), `module.exports = {
            reports: ['v8-json'], outputDir: './reports', typescript: ${JSON.stringify(configured)},
            entryFilter: (item) => item.url.endsWith('/subject.ts')
        };`);
        const child = runCLI(root, [... (flag ? [flag] : []), process.execPath, 'subject.ts']);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-report.json'), 'utf8'));
        assert.equal(report.files.length, 1);
        assert.equal(hasTypeAnalysis(report.files[0]), expected);
    };

    [
        [null, null, true],
        [null, false, false],
        [null, true, true],
        ['--typescript', false, true],
        ['--no-typescript', true, false]
    ].forEach(([flag, configured, expected]) => {
        it(`CLI ${flag || 'default'} respects configuration ${configured}`, () => runCliCase(flag, configured, expected));
    });
});
