import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { decode } from '@jridgewell/sourcemap-codec';
import { createNativeTypeScriptSourceMap } from '../../lib/utils/source-map.js';

const url = 'file:///project/subject.ts';

describe('native TypeScript source maps', () => {
    it('maps preserved/replaced boundaries and line ends without per-character segments', () => {
        const original = 'const value: number = 1;\n';
        const source = stripTypeScriptTypes(original);
        const map = createNativeTypeScriptSourceMap(url, original, source);
        assert.equal(map.version, 3);
        assert.deepEqual(map.sources, [url]);
        assert.deepEqual(map.sourcesContent, [original]);
        assert.deepEqual(map.names, []);
        const lines = decode(map.mappings);
        assert.deepEqual(lines, [
            [[0, 0, 0, 0], [11, 0, 0, 11], [12, 0, 0, 12], [13, 0, 0, 13], [19, 0, 0, 19], [24, 0, 0, 24]],
            [[0, 0, 1, 0]]
        ]);
    });

    ['', '\uFEFF'].forEach((prefix) => {
        ['\n', '\r\n', '\r', '\u2028', '\u2029'].forEach((newline) => {
            it(`preserves UTF-16 columns with prefix=${JSON.stringify(prefix)}, newline=${JSON.stringify(newline)}`, () => {
                const original = `${prefix}const label: string = '中文🚀';${newline}const value: number = 1;${newline}`;
                const source = stripTypeScriptTypes(original);
                const map = createNativeTypeScriptSourceMap(url, original, source);
                const generatedLines = source.split(/\r\n|[\r\n\u2028\u2029]/);
                const originalLines = original.split(/\r\n|[\r\n\u2028\u2029]/);
                decode(map.mappings).forEach((segments, line) => {
                    const offset = line === 0 ? prefix.length : 0;
                    assert.equal(segments[0][0], 0);
                    assert.equal(segments.at(-1)[0], generatedLines[line].length);
                    let previous = -1;
                    for (const [column, sourceIndex, originalLine, originalColumn] of segments) {
                        assert.ok(column > previous);
                        previous = column;
                        assert.equal(sourceIndex, 0);
                        assert.equal(originalLine, line);
                        assert.equal(originalColumn, column + offset);
                        assert.ok(originalColumn <= originalLines[line].length);
                    }
                });
            });
        });
    });

    it('handles empty, BOM-only and type-only sources', () => {
        for (const original of ['', '\uFEFF', 'export interface Info { value: number; }']) {
            const map = createNativeTypeScriptSourceMap(url, original, stripTypeScriptTypes(original));
            assert.deepEqual(map.sourcesContent, [original]);
            assert.ok(decode(map.mappings)[0].length > 0);
        }
    });

    it('uses only two anchors for a long unchanged line', () => {
        const source = `const value = '${'x'.repeat(10000)}';`;
        const map = createNativeTypeScriptSourceMap(url, source, source);
        assert.deepEqual(decode(map.mappings), [[[0, 0, 0, 0], [source.length, 0, 0, source.length]]]);
    });

    it('rejects generated sources with incompatible lengths or line endings', () => {
        assert.throws(() => createNativeTypeScriptSourceMap(url, 'const value: number = 1;', 'const value = 1;'), /preserve source positions/);
        assert.throws(() => createNativeTypeScriptSourceMap(url, 'a\rb', 'a\nb'), /changed line endings/);
        assert.throws(() => createNativeTypeScriptSourceMap(url, 'a\nb', 'a b'), /changed line endings/);
    });
});
