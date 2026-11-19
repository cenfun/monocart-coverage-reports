import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { MCR } from '../../lib/index.js';
import { mergeV8Coverage, mergeV8DataList } from '../../lib/v8/v8.js';
import { Util } from '../../lib/utils/util.js';
import { createTempRoot } from './unit-utils.js';

const source = 'interface Options {\n    value: number;\n}\nconst value: number = 1;\n';
const entry = (url, text = source, extra = {}) => ({
    url,
    source: text,
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: text.length, count: 1
        }]
    }],
    ... extra
});

describe('V8 runtime source identity', () => {
    let root;
    beforeEach(() => {
        root = createTempRoot('mcr-v8-identity-');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const generate = async (entries, name) => {
        const report = MCR({
            logging: 'off',
            reports: ['v8-json', 'raw'],
            outputDir: path.join(root, name),
            sourcePath: () => 'same/report-path.ts',
            typescript: true
        });
        await report.add(entries);
        const result = await report.generate();
        assert.ok(result);
        return result;
    };

    [
        ['identical URL and source', [entry('file:///one.ts'), entry('file:///one.ts')], 1],
        ['different URLs normalized to the same path', [entry('file:///one.ts'), entry('file:///two.ts')], 1],
        ['identical URL with different source', [entry('file:///one.ts'), entry('file:///one.ts', source.replace('= 1', '= 2'))], 2]
    ].forEach(([name, entries, expected]) => {
        it(`merges only matching final paths and source contents: ${name}`, async () => {
            const result = await generate(structuredClone(entries), 'original');
            assert.equal(result.files.length, expected);
            assert.equal(new Set(result.files.map((file) => file.id)).size, expected);
            for (const file of result.files) {
                assert.equal(file.id, Util.calculateSha1(file.sourcePath + file.source));
                for (const key of ['sourceContentId', 'mergeId', 'fileIds']) {
                    assert.equal(Object.hasOwn(file, key), false, `${key} is not part of report output`);
                }
            }
            const rawFiles = fs.readdirSync(path.join(root, 'original/raw')).filter((file) => file.startsWith('coverage-'));
            const records = rawFiles.flatMap((file) => JSON.parse(fs.readFileSync(path.join(root, 'original/raw', file), 'utf8')).data);
            assert.equal(new Set(records.map((record) => record.id)).size, expected);
            assert.equal(new Set(records.map((record) => record.url)).size, new Set(entries.map((item) => item.url)).size);
            for (const record of records) {
                const text = entries.find((item) => item.url === record.url && Util.calculateSha1(record.sourcePath + item.source) === record.id).source;
                assert.equal(record.id, Util.calculateSha1(record.sourcePath + text));
                for (const key of ['sourceContentId', 'mergeId', 'fileIds']) {
                    assert.equal(Object.hasOwn(record, key), false, `${key} is not added to raw records`);
                }
                assert.ok(fs.existsSync(path.join(root, 'original/raw', `source-${record.id}.json`)));
            }
            assert.ok(result.files.every((file) => file.data.statements[0].count === (expected === 1 ? 2 : 1)));
            const merged = await MCR({
                logging: 'off',
                reports: ['v8-json'],
                typescript: true,
                inputDir: path.join(root, 'original/raw'),
                outputDir: path.join(root, 'merged')
            }).generate();
            assert.ok(merged);
            assert.equal(merged.files.length, expected);
            assert.deepEqual(merged.summary, result.summary);
        });
    });

    [[false, true], [true, false]].forEach((order) => {
        it(`retains distinct native TS loading facts in merge order ${order}`, async () => {
            // Unconfirmed original TS needs an explicit policy; facts from a
            // different execution must not silently enable stripping for it.
            const automatic = MCR({
                logging: 'off', reports: ['v8-json'], outputDir: path.join(root, 'automatic')
            });
            await automatic.add(order.map((nativeTypeScript) => entry('file:///subject.ts', source, {
                nativeTypeScript
            })));
            await assert.rejects(automatic.generate(), /Incompatible analysis sources/);
            const decisions = [];
            const report = MCR({
                logging: 'off',
                reports: ['v8-json', 'raw'],
                outputDir: path.join(root, 'native'),
                typescript: (info) => {
                    decisions.push(info.nativeTypeScript);
                    return true;
                }
            });
            await report.add(order.map((nativeTypeScript) => entry('file:///subject.ts', source, {
                nativeTypeScript
            })));
            const result = await report.generate();
            assert.ok(result);
            assert.equal(result.files.length, 1);
            assert.equal(result.files[0].nativeTypeScript, true);
            assert.deepEqual(decisions, order);
            assert.equal(result.files[0].summary.lines.total, 1);
            assert.equal(result.files[0].summary.statements.total, 1);
            assert.equal(result.files[0].data.statements[0].count, 2);
            const merged = await MCR({
                logging: 'off',
                reports: ['v8-json'],
                inputDir: path.join(root, 'native/raw'),
                outputDir: path.join(root, 'merged-native'),
                typescript: true
            }).generate();
            assert.ok(merged);
            assert.deepEqual(merged.files[0].data, result.files[0].data);
        });
    });

    it('merges mapped originals from different bundles with matching direct coverage', async () => {
        const text = 'const value = 1;\n';
        const originalURL = 'file:///original.js';
        const map = {
            version: 3,
            names: [],
            sources: [originalURL],
            sourcesContent: [text],
            mappings: 'AAAA'
        };
        const result = await generate([
            entry('file:///bundle-one.js', text, {
                sourceMap: structuredClone(map)
            }),
            entry('file:///bundle-two.js', text, {
                sourceMap: structuredClone(map)
            }),
            entry(originalURL, text)
        ], 'mapped');
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].url, originalURL);
        assert.equal(result.files[0].data.statements[0].count, 3);
    });

    it('rejects duplicate Istanbul output paths instead of overwriting distinct files', async () => {
        const report = MCR({
            logging: 'off',
            reports: ['json'],
            outputDir: path.join(root, 'istanbul'),
            sourcePath: () => 'same.ts',
            typescript: true
        });
        await report.add([entry('file:///one.ts'), entry('file:///two.ts', source.replace('= 1', '= 2'))]);
        await assert.rejects(report.generate(), /distinct files sharing sourcePath: same\.ts/);
        assert.equal(fs.existsSync(path.join(root, 'istanbul/coverage-final.json')), false);
    });

    [null, true].forEach((typescript) => {
        it(`preserves saved IDs and only separates URLs for explicit TS analysis (typescript=${typescript})`, async () => {
            const legacyId = 'old-sourcePath-based-id';
            const records = ['file:///one.ts', 'file:///two.ts'].map((url) => ({
                ... entry(url), id: legacyId, sourcePath: 'same.ts', type: 'js'
            }));
            const merged = await mergeV8Coverage([{
                type: 'v8', data: records
            }], new Map([[legacyId, {
                source
            }]]), {
                typescript
            });
            assert.equal(merged.length, typescript ? 2 : 1);
            assert.ok(merged.every((item) => item.id === legacyId && item.source === source));
            assert.equal(new Set(merged.map((item) => item.url)).size, typescript ? 2 : 1);
            assert.ok(merged.every((item) => item.functions[0].ranges[0].count === (typescript ? 1 : 2)));
            assert.ok(records.every((record) => record.id === legacyId));
        });

        it(`retains legacy raw compaction unless TS analysis is enabled (typescript=${typescript})`, async () => {
            const records = ['file:///one.ts', 'file:///two.ts'].map((url) => ({
                ... entry(url), id: 'legacy-id', sourcePath: 'same.ts', type: 'js'
            }));
            const merged = await mergeV8DataList([{
                type: 'v8', data: records
            }], {
                typescript
            });
            assert.equal(merged.length, typescript ? 2 : 1);
            assert.ok(merged.every((record) => record.functions[0].ranges[0].count === (typescript ? 1 : 2)));
        });
    });

    it('keeps the legacy range merge for mapped JS at TS URLs even with force mode', async () => {
        const text = 'var value = 1;\n';
        const id = 'legacy-mapped-id';
        const records = ['file:///one.ts', 'file:///two.ts'].map((url) => ({
            ... entry(url, text), id, sourcePath: 'same.ts', type: 'js'
        }));
        records[0].functions[0].ranges.push({
            startOffset: 4, endOffset: 9, count: 0
        });
        records[1].functions[0].isBlockCoverage = false;
        const merged = await mergeV8Coverage([{
            type: 'v8', data: records
        }], new Map([[id, {
            source: text,
            sourceMap: {
                version: 3, sources: ['original.ts'], sourcesContent: [text], names: [], mappings: 'AAAA'
            }
        }]]), {
            typescript: true
        });
        assert.equal(merged.length, 1);
        assert.equal(merged[0].functions[0].isBlockCoverage, true);
        assert.equal(merged[0].functions[0].ranges[1].count, 0);
    });

    it('rejects missing raw source data instead of reporting empty successful coverage', async () => {
        await assert.rejects(mergeV8Coverage([{
            type: 'v8',
            data: [{
                id: 'missing', sourcePath: 'subject.ts'
            }]
        }], new Map(), {}), /Not found source data/);
    });

    it('rejects conflicting native and transformed identities in either order', async () => {
        for (const reverse of [false, true]) {
            const entries = [entry('file:///subject.ts', source, {
                nativeTypeScript: true
            }), entry('file:///subject.ts', source, {
                typeScriptTransformed: true
            })];
            if (reverse) {
                entries.reverse();
            }
            await assert.rejects(generate(entries, `conflict-${reverse}`), /Conflicting native and transformed TypeScript coverage/);
        }
    });
});
