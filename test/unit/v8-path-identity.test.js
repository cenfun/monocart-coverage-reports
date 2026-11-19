import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';
import { Util } from '../../lib/utils/util.js';
import { createTempRoot } from './unit-utils.js';

const source = 'var value = 1;\n';
const entry = (url, text = source) => ({
    url,
    source: text,
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: text.length, count: 1
        }]
    }]
});

const rawRecords = (dir) => fs.readdirSync(dir).filter((file) => file.startsWith('coverage-')).flatMap((file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).data);

describe('V8 path/content identity', () => {
    let root;
    beforeEach(() => {
        root = createTempRoot('mcr-path-id-');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const generate = async (entries, name, extra = {}) => {
        const report = MCR({
            logging: 'off', reports: ['v8-json', 'raw'], outputDir: path.join(root, name), ... extra
        });
        const added = await report.add(entries);
        const result = await report.generate();
        assert.ok(result);
        return {
            result, added
        };
    };
    const merge = (inputDir, name, extra = {}) => MCR({
        logging: 'off', reports: ['v8-json'], inputDir, outputDir: path.join(root, name), ... extra
    }).generate();

    it('does not merge equal contents with different final paths', async () => {
        const { result, added } = await generate([entry('file:///one.js'), entry('file:///two.js')], 'different-paths');
        assert.equal(result.files.length, 2);
        assert.notEqual(added.data[0].id, added.data[1].id);
        assert.ok(result.files.every((file) => file.id === Util.calculateSha1(file.sourcePath + file.source)));
    });

    it('preserves anonymous IDs and saved paths when importing raw', async () => {
        const { result, added } = await generate([entry('')], 'anonymous', {
            sourcePath: () => 'saved.js'
        });
        assert.equal(added.data[0].id, Util.calculateSha1(`saved.js${source}`));
        assert.equal(result.files[0].id, added.data[0].id);
        const imported = await merge(path.join(root, 'anonymous/raw'), 'anonymous-import', {
            sourcePath: () => {
                throw new Error('saved runtime paths must not run the callback again');
            }
        });
        assert.ok(imported);
        assert.equal(imported.files[0].sourcePath, 'saved.js');
        assert.equal(imported.files[0].id, result.files[0].id);
    });

    it('calculates the existing ID after source-mutating hooks, without calling sourcePath twice', async () => {
        let calls = 0;
        const { result, added } = await generate([entry('file:///one.js')], 'hooks', {
            onEntry: (item) => {
                item.source = item.source.replace('= 1', '= 2');
            },
            sourcePath: (name, item) => {
                calls++;
                assert.ok(item.source.includes('= 2'));
                assert.equal(Object.hasOwn(item, 'id'), false, 'IDs are calculated after hooks finish');
                assert.equal(Object.hasOwn(item, 'sourceContentId'), false);
                item.source = item.source.replace('= 2', '= 3');
                return 'shared.js';
            }
        });
        assert.equal(calls, 1);
        assert.equal(result.files[0].source, 'var value = 3;\n');
        assert.equal(added.data[0].id, Util.calculateSha1('shared.jsvar value = 3;\n'));
        assert.equal(added.data[0].id, result.files[0].id);
    });

    it('hashes the path and source once and does not rehash saved raw IDs', async () => {
        const calculateSha1 = Util.calculateSha1;
        const savedInput = `saved.js${source}`;
        const renamedInput = `renamed.js${source}`;
        const hashed = [];
        Util.calculateSha1 = (input) => {
            if (input === savedInput || input === renamedInput) {
                hashed.push(input);
            }
            return calculateSha1(input);
        };
        try {
            const { result, added } = await generate([entry('file:///one.js')], 'reuse-id', {
                sourcePath: () => 'saved.js'
            });
            assert.deepEqual(hashed, [savedInput]);
            const inputDir = path.join(root, 'reuse-id/raw');
            const imported = await merge(inputDir, 'reuse-import');
            assert.ok(imported);
            assert.deepEqual(hashed, [savedInput], 'no new content hashes during an unchanged raw import');
            assert.equal(imported.files[0].id, result.files[0].id);
            const rewritten = await merge(inputDir, 'rewritten-import', {
                sourcePath: () => {
                    throw new Error('raw import must not rewrite a saved path or source');
                }
            });
            assert.ok(rewritten);
            assert.deepEqual(hashed, [savedInput]);
            assert.equal(rewritten.files[0].id, result.files[0].id);
            const captured = JSON.parse(fs.readFileSync(path.join(inputDir, `source-${added.data[0].id}.json`), 'utf8'));
            for (const item of [added.data[0], captured, ... result.files]) {
                for (const key of ['sourceContentId', 'mergeId', 'fileIds']) {
                    assert.equal(Object.hasOwn(item, key), false, `${key} is not generated`);
                }
            }
        } finally {
            Util.calculateSha1 = calculateSha1;
        }
    });

    it('does not rebase saved runtime paths or IDs when importing raw', async () => {
        const url = pathToFileURL(path.join(root, 'build/src/one.js')).href;
        const { result, added } = await generate([entry(url)], 'base', {
            baseDir: path.join(root, 'build')
        });
        assert.equal(result.files[0].sourcePath, 'src/one.js');
        const imported = await merge(path.join(root, 'base/raw'), 'rebased', {
            baseDir: root
        });
        assert.ok(imported);
        assert.equal(imported.files[0].sourcePath, 'src/one.js');
        assert.equal(imported.files[0].id, added.data[0].id);
    });

    it('identifies untested files after their path callback and transformer finish', async () => {
        const file = path.join(root, 'unused.ts');
        fs.writeFileSync(file, source);
        const report = MCR({
            logging: 'off',
            reports: ['v8-json', 'raw'],
            outputDir: path.join(root, 'untested'),
            sourcePath: () => 'renamed.ts',
            all: {
                dir: root,
                filter: (name) => name.endsWith('unused.ts'),
                transformer: (item) => {
                    item.source = item.source.replace('= 1', '= 2');
                }
            }
        });
        const result = await report.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        const id = Util.calculateSha1('renamed.tsvar value = 2;\n');
        assert.equal(result.files[0].id, id);
        const records = rawRecords(path.join(root, 'untested/raw'));
        assert.equal(records[0].id, id);
        const captured = JSON.parse(fs.readFileSync(path.join(root, 'untested/raw', `source-${id}.json`), 'utf8'));
        assert.equal(captured.source, 'var value = 2;\n');
    });

    it('preserves distinct saved runtime paths even when raw import supplies another path callback', async () => {
        const first = await generate([entry('file:///same.js')], 'first', {
            sourcePath: () => 'first.js'
        });
        const second = await generate([entry('file:///same.js')], 'second', {
            sourcePath: () => 'second.js'
        });
        assert.notEqual(first.added.data[0].id, second.added.data[0].id);
        const inputs = ['first', 'second'].map((name) => path.join(root, name, 'raw'));
        const separate = await merge(inputs, 'separate');
        assert.ok(separate);
        assert.equal(separate.files.length, 2);
        assert.notEqual(separate.files[0].id, separate.files[1].id);
        assert.deepEqual(separate.files.map((file) => file.id).sort(), [first.added.data[0].id, second.added.data[0].id].sort());
        const joined = await merge(inputs, 'joined', {
            sourcePath: () => {
                throw new Error('saved paths must not be rewritten');
            }
        });
        assert.ok(joined);
        assert.deepEqual(joined.files.map((file) => file.sourcePath), ['first.js', 'second.js']);
        assert.ok(joined.files.every((file) => file.data.statements[0].count === 1));
        assert.deepEqual(rawRecords(inputs[0]).map((record) => record.id), [first.added.data[0].id]);
    });

    [false, true].forEach((zip) => {
        it(`keeps legacy JS compaction and source references through merge=true, zip=${zip}`, async () => {
            const { result } = await generate([entry('file:///one.js'), entry('file:///two.js')], 'compact', {
                reports: ['v8-json', ['raw', {
                    merge: true, zip
                }]],
                sourcePath: () => 'shared.js'
            });
            assert.equal(result.files.length, 1);
            assert.equal(result.files[0].id, Util.calculateSha1(`shared.js${source}`));
            const input = path.join(root, 'compact', zip ? 'raw.zip' : 'raw');
            if (!zip) {
                const records = rawRecords(input);
                assert.equal(records.length, 1, 'ordinary JS still compacts by the existing ID');
                assert.equal(records[0].functions[0].ranges[0].count, 2);
                for (const record of records) {
                    const captured = JSON.parse(fs.readFileSync(path.join(input, `source-${record.id}.json`), 'utf8'));
                    assert.equal(captured.id, record.id);
                    assert.equal(captured.source, source);
                }
            }
            const separate = await merge(input, 'reimported', {
                sourcePath: () => {
                    throw new Error('raw import must retain the saved runtime path');
                }
            });
            assert.ok(separate);
            assert.equal(separate.files.length, 1);
            assert.equal(separate.files[0].id, result.files[0].id);
            assert.equal(separate.files[0].data.statements[0].count, 2);
        });
    });

    it('corrects per-file BOM coordinates before joining normalized paths', async () => {
        const text = '\uFEFFfunction pick() { return 1; }\npick();\n';
        const create = (url, nativeTypeScript) => {
            const item = entry(url, text);
            item.nativeTypeScript = nativeTypeScript;
            const offset = nativeTypeScript ? 1 : 0;
            item.functions[0].ranges[0].endOffset -= offset;
            item.functions.push({
                functionName: 'pick',
                isBlockCoverage: true,
                ranges: [{
                    startOffset: text.indexOf('function') - offset, endOffset: text.indexOf('}') + 1 - offset, count: 1
                }]
            });
            return item;
        };
        const { result } = await generate([create('file:///native.ts', true), create('file:///runtime.js', false)], 'coordinates', {
            sourcePath: () => 'shared.js'
        });
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].id, Util.calculateSha1(`shared.js${text}`));
        assert.equal(result.files[0].data.functions.length, 1);
        assert.equal(result.files[0].data.functions[0].start, 1);
        assert.equal(result.files[0].data.functions[0].count, 2);
    });

    it('merges both original sources when two sourcemap URLs normalize to one path', async () => {
        const bundle = entry('file:///bundle.js', source.repeat(2));
        bundle.sourceMap = {
            version: 3,
            names: [],
            sources: ['file:///one.js', 'file:///two.js'],
            sourcesContent: [source, source],
            mappings: 'AAAA;ACAA'
        };
        const { result } = await generate([bundle], 'originals', {
            sourcePath: () => 'shared.js'
        });
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].id, Util.calculateSha1(`shared.js${source}`));
        assert.equal(result.files[0].data.statements[0].count, 2);
    });

    it('rejects incompatible runtime analysis sources instead of choosing one interpretation', async () => {
        const typed = 'interface Options { value: number; }\nvar value: number = 1;\n';
        await assert.rejects(generate([entry('file:///one.ts', typed), entry('file:///two.ts', typed)], 'incompatible', {
            sourcePath: () => 'shared.ts',
            typescript: (info) => info.url.endsWith('/one.ts')
        }), /Incompatible analysis sources for shared\.ts/);
    });

    it('joins normalized runtime paths for Istanbul output without losing hit counts', async () => {
        const { result } = await generate([entry('file:///one.js'), entry('file:///two.js')], 'istanbul', {
            reports: ['json'], sourcePath: () => 'shared.js'
        });
        assert.equal(result.files.length, 1);
        const coverage = JSON.parse(fs.readFileSync(path.join(root, 'istanbul/coverage-final.json'), 'utf8'));
        assert.deepEqual(Object.keys(coverage), ['shared.js']);
        assert.ok(Object.values(coverage['shared.js'].s).every((count) => count === 2));
    });
});
