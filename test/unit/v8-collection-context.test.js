import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';
import { Util } from '../../lib/utils/util.js';
import { createTempRoot } from './unit-utils.js';

const source = 'const value = 1;\n';
const entry = (original) => ({
    url: 'file:///bundle.js',
    source,
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: source.length, count: 1
        }]
    }],
    sourceMap: {
        version: 3, names: [], sources: [original], sourcesContent: [source], mappings: 'AAAA'
    }
});

const records = (dir) => fs.readdirSync(dir).filter((file) => file.startsWith('coverage-')).flatMap((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).data);

describe('V8 collection context isolation', () => {
    let root;
    beforeEach(() => {
        root = createTempRoot('mcr-collection-context-');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const reimport = (inputDir, name) => MCR({
        logging: 'off', reports: ['v8-json'], inputDir, outputDir: path.join(root, name)
    }).generate();
    const assertOriginals = (result) => {
        assert.ok(result);
        assert.deepEqual(result.files.map((file) => file.url).sort(), ['file:///original-one.js', 'file:///original-two.js']);
        assert.ok(result.files.every((file) => file.data.statements[0].count === 1));
    };

    [false, true].forEach((separateAdds) => {
        [false, true].forEach((zip) => {
            it(`retains different maps for identical runtime files (separateAdds=${separateAdds}, zip=${zip})`, async () => {
                let serial = 0;
                const outputDir = path.join(root, 'report');
                const report = MCR({
                    logging: 'off',
                    outputDir,
                    reports: ['v8-json', ['raw', {
                        merge: true, zip
                    }]],
                    sourcePath: (name, info) => (info.url === 'file:///bundle.js' ? `build-${++serial}/bundle.js` : name)
                });
                const entries = [entry('file:///original-one.js'), entry('file:///original-two.js')];
                const added = [];
                if (separateAdds) {
                    for (const item of entries) {
                        added.push(... (await report.add([item])).data);
                    }
                } else {
                    added.push(... (await report.add(entries)).data);
                }
                assert.notEqual(added[0].id, added[1].id, 'different report paths retain their existing IDs');
                assertOriginals(await report.generate());
                const input = path.join(outputDir, zip ? 'raw.zip' : 'raw');
                if (!zip) {
                    const raw = records(input);
                    assert.equal(raw.length, 2);
                    assert.notEqual(raw[0].sourceCacheId, raw[1].sourceCacheId);
                    for (const item of raw) {
                        assert.ok(fs.existsSync(path.join(input, `source-${item.sourceCacheId}.json`)));
                    }
                }
                assertOriginals(await reimport(input, 'reimported'));
            });
        });
    });

    it('keeps map variants separate even when their runtime report paths match', async () => {
        const report = MCR({
            logging: 'off',
            reports: ['v8-json', ['raw', {
                merge: true
            }]],
            outputDir: path.join(root, 'same-path')
        });
        await report.add([entry('file:///original-one.js'), entry('file:///original-two.js')]);
        assertOriginals(await report.generate());
        const rawDir = path.join(root, 'same-path/raw');
        assert.equal(records(rawDir).length, 2);
        assertOriginals(await reimport(rawDir, 'same-path-reimported'));
    });

    it('keeps maps paired when importing separate raw directories with identical file IDs', async () => {
        const inputs = [];
        for (const name of ['one', 'two']) {
            const outputDir = path.join(root, name);
            const report = MCR({
                logging: 'off', reports: ['v8-json', 'raw'], outputDir
            });
            await report.add([entry(`file:///original-${name}.js`)]);
            assert.ok(await report.generate());
            inputs.push(path.join(outputDir, 'raw'));
        }
        assertOriginals(await reimport(inputs, 'joined-inputs'));
    });

    it('keeps legacy map variants and their saved runtime references intact', async () => {
        const inputs = [];
        for (const name of ['one', 'two']) {
            const dir = path.join(root, `legacy-${name}`);
            fs.mkdirSync(dir);
            inputs.push(dir);
            const item = entry(`file:///original-${name}.js`);
            const id = `old-path-based-${name}`;
            fs.writeFileSync(path.join(dir, `source-${id}.json`), JSON.stringify({
                id, source: item.source, sourceMap: item.sourceMap
            }));
            delete item.source;
            delete item.sourceMap;
            fs.writeFileSync(path.join(dir, `coverage-${name}.json`), JSON.stringify({
                type: 'v8',
                data: [{
                    ... item, id, type: 'js', sourcePath: `${name}/bundle.js`
                }]
            }));
        }
        const result = await MCR({
            logging: 'off',
            reports: ['v8-json'],
            inputDir: inputs,
            outputDir: path.join(root, 'legacy-import'),
            sourcePath: (name, info) => {
                assert.notEqual(info.url, 'file:///bundle.js', 'saved runtime paths must not be rewritten');
                return name;
            }
        }).generate();
        assertOriginals(result);
    });

    [false, true].forEach((mapFirst) => {
        it(`does not reuse a mapped source for an unmapped execution (mapFirst=${mapFirst})`, async () => {
            const mapped = entry('file:///original-one.js');
            const unmapped = entry('file:///unused.js');
            delete unmapped.sourceMap;
            const outputDir = path.join(root, 'mapped-and-unmapped');
            const report = MCR({
                logging: 'off',
                reports: ['v8-json', ['raw', {
                    merge: true
                }]],
                outputDir
            });
            for (const item of mapFirst ? [mapped, unmapped] : [unmapped, mapped]) {
                await report.add([item]);
            }
            const result = await report.generate();
            assert.ok(result);
            assert.deepEqual(result.files.map((file) => file.url).sort(), ['file:///bundle.js', 'file:///original-one.js']);
            assert.ok(result.files.every((file) => file.data.statements[0].count === 1));
            const merged = await reimport(path.join(outputDir, 'raw'), 'mapped-and-unmapped-import');
            assert.ok(merged);
            // JSON round trips omit optional properties whose values are undefined.
            assert.deepEqual(JSON.parse(JSON.stringify(merged.files)), JSON.parse(JSON.stringify(result.files)));
        });
    });

    it('resolves changed external maps before reusing a source cache entry', async () => {
        const outputDir = path.join(root, 'external-maps');
        let currentMap;
        let calls = 0;
        const report = MCR({
            logging: 'off',
            outputDir,
            reports: ['v8-json', ['raw', {
                merge: true
            }]],
            sourceMapResolver: () => {
                calls += 1;
                return currentMap;
            }
        });
        for (const name of ['one', 'two', 'two']) {
            const item = entry(`file:///original-${name}.js`);
            currentMap = item.sourceMap;
            delete item.sourceMap;
            item.source += '//# sourceMappingURL=bundle.js.map\n';
            item.functions[0].ranges[0].endOffset = item.source.length;
            await report.add([item]);
        }
        const result = await report.generate();
        assert.ok(result);
        assert.equal(calls, 3);
        assert.deepEqual(result.files.map((file) => [file.url, file.data.statements[0].count]), [
            ['file:///original-one.js', 1], ['file:///original-two.js', 2]
        ]);
        const rawDir = path.join(outputDir, 'raw');
        assert.equal(records(rawDir).length, 2, 'identical contexts can still be compacted');
        assert.equal(fs.readdirSync(rawDir).filter((file) => file.startsWith('source-')).length, 2);
        const merged = await reimport(rawDir, 'external-maps-reimported');
        assert.ok(merged);
        assert.deepEqual(merged.files, result.files);
    });

    [false, true].forEach((reverse) => {
        [false, true].forEach((zip) => {
            it(`normalizes native and JS-loader coordinates before combining (reverse=${reverse}, zip=${zip})`, async () => {
                const filename = path.join(root, 'subject.ts');
                const text = '\uFEFFexport function pick(value) { return value ? 1 : 0; }\npick(1);\n';
                fs.writeFileSync(filename, text);
                fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
                const loader = path.join(root, 'loader.mjs');
                fs.writeFileSync(loader, `import { registerHooks } from 'node:module';
                    registerHooks({ load(url, context, next) {
                        const loaded = next(url, context);
                        return url.endsWith('/subject.ts') ? { ...loaded, format: 'module' } : loaded;
                    } });`);
                const register = import.meta.resolve('monocart-coverage-reports/register');
                const dirs = [];
                for (const native of [true, false]) {
                    const dir = path.join(root, native ? 'native' : 'javascript');
                    dirs.push(dir);
                    const child = spawnSync(process.execPath, [
                        ... (native ? [] : ['--import', pathToFileURL(loader).href]), '--import', register, filename
                    ], {
                        env: {
                            ... process.env, NODE_V8_COVERAGE: dir
                        },
                        encoding: 'utf8',
                        timeout: 10000
                    });
                    assert.ifError(child.error);
                    assert.equal(child.status, 0, child.stdout + child.stderr);
                }
                if (reverse) {
                    dirs.reverse();
                }
                const outputDir = path.join(root, 'combined');
                const report = MCR({
                    logging: 'off',
                    outputDir,
                    reports: ['v8-json', ['raw', {
                        merge: true, zip
                    }]],
                    entryFilter: (item) => item.url === pathToFileURL(filename).href
                });
                for (const dir of dirs) {
                    await report.addFromDir(dir);
                }
                const result = await report.generate();
                assert.ok(result);
                assert.equal(result.files.length, 1);
                const file = result.files[0];
                assert.equal(file.nativeTypeScript, true);
                assert.equal(file.id, Util.calculateSha1(file.sourcePath + text));
                assert.equal(file.source, text);
                assert.equal(file.data.functions.length, 1);
                assert.ok(file.data.functions.every((range) => range.count === 2));
                assert.ok(file.data.statements.every((range) => range.count === 2));
                assert.deepEqual(file.data.branches.map((range) => range.count), [2, 0]);
                const input = path.join(outputDir, zip ? 'raw.zip' : 'raw');
                if (!zip) {
                    const raw = records(input);
                    assert.equal(raw.length, 2, 'raw compaction must retain each loading context');
                    assert.equal(raw.filter((item) => item.nativeTypeScript).length, 1);
                }
                const merged = await reimport(input, 'reimported');
                assert.ok(merged);
                assert.deepEqual(merged.files[0].data, file.data);
                assert.deepEqual(merged.summary, result.summary);
            });
        });
    });
});
