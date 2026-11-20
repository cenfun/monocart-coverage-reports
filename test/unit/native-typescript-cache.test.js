import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module, { stripTypeScriptTypes, syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';
import { createNativeTypeScriptSourceMap } from '../../lib/utils/source-map.js';

const writeInputs = (root, records, snapshots = [0]) => {
    const dir = path.join(root, 'coverage');
    fs.mkdirSync(dir);
    const captures = records.map(({ source, filename = 'subject.ts' }, index) => {
        const url = pathToFileURL(path.join(root, filename)).href;
        const generated = stripTypeScriptTypes(source, {
            mode: 'strip'
        });
        const execution = {
            processId: 100 + index,
            threadId: 0,
            // Process start time (Unix epoch milliseconds).
            timestamp: 1000
        };
        fs.writeFileSync(path.join(dir, `source-${index}.json`), JSON.stringify({
            url, source, execution, nativeTypeScript: true
        }));
        return {
            url, source, generated, execution
        };
    });
    snapshots.forEach((index, snapshot) => {
        const {
            url, generated, execution
        } = captures[index];
        // Filename timestamp is the snapshot write time (Unix epoch milliseconds).
        const filename = `coverage-${execution.processId}-${2000 + snapshot}-0.json`;
        fs.writeFileSync(path.join(dir, filename), JSON.stringify({
            result: [{
                scriptId: '1',
                url,
                functions: [{
                    functionName: '',
                    isBlockCoverage: true,
                    ranges: [{
                        startOffset: 0, endOffset: generated.length, count: 1
                    }]
                }]
            }]
        }));
    });
    return {
        dir, captures
    };
};

const trackStripping = (t) => {
    const strip = Module.stripTypeScriptTypes;
    const tracked = t.mock.method(Module, 'stripTypeScriptTypes', (... args) => strip(... args));
    syncBuiltinESMExports();
    t.after(() => {
        tracked.mock.restore();
        syncBuiltinESMExports();
    });
    return tracked.mock;
};

describe('native TypeScript normalization cache', () => {
    let root;
    const reporter = (options = {}) => MCR({
        logging: 'off',
        baseDir: root,
        outputDir: path.join(root, 'report'),
        reports: ['v8-json'],
        ... options
    });
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr native ts cache '));
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    it('normalizes one captured source once across repeated snapshots', async (t) => {
        const source = '\uFEFFexport const value: number = 42;\n';
        const count = 8;
        const { dir, captures: [capture] } = writeInputs(root, [{
            source
        }], Array(count).fill(0));
        const expectedMap = createNativeTypeScriptSourceMap(capture.url, source, capture.generated);
        const stripCalls = trackStripping(t);
        const maps = [];
        const coverage = reporter({
            onEntry: (entry) => {
                assert.equal(entry.source, capture.generated);
                assert.deepEqual(entry.sourceMap, expectedMap);
                maps.push(entry.sourceMap);
            }
        });
        await coverage.addFromDir(dir);
        assert.equal(stripCalls.calls.length, 1);
        assert.equal(maps.length, count);
        assert.equal(new Set(maps).size, count, 'entry maps must remain separate objects');
        for (const key of ['sources', 'sourcesContent', 'names']) {
            assert.equal(new Set(maps.map((map) => map[key])).size, count, `${key} arrays must remain entry-local`);
        }
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].source, source);
        assert.ok(result.files[0].data.statements.length > 0);
        assert.ok(result.files[0].data.statements.every((statement) => statement.count === count));
        assert.equal(stripCalls.calls.length, 1);
    });

    it('does not let onEntry mutations affect later snapshots', async (t) => {
        const source = 'export const value: number = 42;\n';
        const modified = source.replace('42', '43');
        const { dir, captures: [capture] } = writeInputs(root, [{
            source
        }], [0, 0]);
        const expectedMap = createNativeTypeScriptSourceMap(capture.url, source, capture.generated);
        const stripCalls = trackStripping(t);
        const maps = [];
        const coverage = reporter({
            onEntry: async (entry) => {
                assert.equal(entry.source, capture.generated);
                assert.deepEqual(entry.sourceMap, expectedMap);
                maps.push(entry.sourceMap);
                if (maps.length === 1) {
                    entry.source = entry.source.replace('42', '43');
                    entry.sourceMap.sources[0] = pathToFileURL(path.join(root, 'first.ts')).href;
                    entry.sourceMap.sourcesContent[0] = modified;
                    entry.sourceMap.names.push('first-only');
                    entry.sourceMap.mappings += ';';
                    entry.sourceMap.file = 'first-only.js';
                    await Promise.resolve();
                }
            }
        });
        await coverage.addFromDir(dir);
        assert.equal(stripCalls.calls.length, 1);
        assert.equal(maps.length, 2);
        assert.notEqual(maps[0], maps[1]);
        assert.deepEqual(maps[1], expectedMap);
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [source, modified].sort());
    });

    it('keeps distinct TS originals separate even when they strip to identical JS', async (t) => {
        const first = 'export const value: number = 42;\n';
        const second = first.replace('number', 'string');
        const { dir, captures } = writeInputs(root, [{
            source: first
        }, {
            source: second
        }], [0, 0, 1, 1]);
        assert.equal(captures[0].generated, captures[1].generated);
        const stripCalls = trackStripping(t);
        const originals = [];
        const coverage = reporter({
            onEntry: (entry) => originals.push(entry.sourceMap.sourcesContent[0])
        });
        await coverage.addFromDir(dir);
        assert.equal(stripCalls.calls.length, 2);
        assert.deepEqual(originals.sort(), [first, first, second, second].sort());
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [first, second].sort());
        for (const file of result.files) {
            assert.ok(file.data.statements.length > 0);
            assert.ok(file.data.statements.every((statement) => statement.count === 2));
        }
    });

    it('keeps source maps separate for different URLs with identical source text', async (t) => {
        const source = 'export const value: number = 42;\n';
        const { dir, captures } = writeInputs(root, [
            {
                source, filename: 'first.ts'
            },
            {
                source, filename: 'second.ts'
            }
        ], [0, 1, 0, 1]);
        const stripCalls = trackStripping(t);
        const coverage = reporter({
            onEntry: (entry) => {
                assert.deepEqual(entry.sourceMap.sources, [entry.url]);
                assert.deepEqual(entry.sourceMap.sourcesContent, [source]);
            }
        });
        await coverage.addFromDir(dir);
        assert.equal(stripCalls.calls.length, 2);
        assert.notEqual(captures[0].url, captures[1].url);
        const result = await coverage.generate();
        assert.ok(result);
        assert.deepEqual(result.files.map((file) => file.sourcePath).sort(), ['first.ts', 'second.ts']);
    });
});
