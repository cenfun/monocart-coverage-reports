import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Locator } from 'monocart-locator';
import { findOriginalRange } from '../../lib/converter/find-original-range.js';

const createMapping = (source = 'a{}', originalSource = source, js = false) => {
    const originalState = {
        source: originalSource,
        sourcePath: 'original.css',
        locator: new Locator(originalSource)
    };
    const state = {
        js,
        source,
        sourcePath: 'bundle.css',
        locator: new Locator(source),
        rangeCache: new Map(),
        decodedMappings: Array.from(source, (_, offset) => ({
            generatedOffset: offset,
            originalOffset: offset,
            sourceIndex: 0
        }))
    };
    return {
        state, originalMap: new Map([[0, originalState]])
    };
};

describe('findOriginalRange result contract', () => {
    for (const [name, start, last] of [
        ['negative start', -1, 2],
        ['non-integer start', 0.5, 2],
        ['end beyond source', 0, 3],
        ['empty range', 1, 0],
        ['reversed range', 2, 0]
    ]) {
        it(`returns a cached CSS error for ${name}`, () => {
            const { state, originalMap } = createMapping();
            state.decodedMappings[0].originalOffset = start;
            state.decodedMappings[2].originalOffset = last;
            const result = findOriginalRange(0, 3, state, originalMap);
            assert.equal(result.error, true);
            assert.ok(result.errors.length > 0);
            assert.equal(result.sourcePath, state.sourcePath);
            assert.strictEqual(findOriginalRange(0, 3, state, originalMap), result);
        });
    }

    for (const offset of [0, -1]) {
        it(`rejects and caches same-source interior mappings before the original range (offset: ${offset})`, () => {
            const { state, originalMap } = createMapping('abc;', '0123456789');
            state.decodedMappings.forEach((mapping, i) => {
                mapping.originalOffset = i + 1;
            });
            state.decodedMappings[1].originalOffset = offset;
            const options = {
                fixOriginalRange: true
            };
            const result = findOriginalRange(0, 4, state, originalMap, options);
            assert.equal(result.error, true);
            assert.match(result.errors[0], /before original CSS range/);
            assert.strictEqual(findOriginalRange(0, 4, state, originalMap, options), result);
        });
    }

    it('ignores synthetic line ends before a valid original CSS range', () => {
        const { state, originalMap } = createMapping('abc;', '0123456789');
        state.decodedMappings.forEach((mapping, i) => {
            mapping.originalOffset = i + 1;
        });
        state.decodedMappings[1].end = true;
        state.decodedMappings[1].originalOffset = 0;
        const result = findOriginalRange(0, 4, state, originalMap);
        assert.ok(!result.error);
        assert.equal(result.start, 1);
        assert.equal(result.end, 5);
    });

    it('preserves the existing JS whitespace correction and cache behavior', () => {
        const source = '  a();  ';
        const { state, originalMap } = createMapping(source, source, true);
        const raw = findOriginalRange(0, source.length, state, originalMap);
        assert.equal(raw.start, 0);
        assert.equal(raw.end, source.length);
        const options = {
            fixOriginalRange: true
        };
        const result = findOriginalRange(0, source.length, state, originalMap, options);
        assert.ok(!result.error);
        assert.equal(result.start, 2);
        assert.equal(result.end, 6);
        assert.strictEqual(findOriginalRange(0, source.length, state, originalMap, options), result);
        assert.strictEqual(findOriginalRange(0, source.length, state, originalMap), raw);
    });

    it('preserves the existing JS reversed-range error', () => {
        const { state, originalMap } = createMapping('a{}', 'a{}', true);
        state.decodedMappings[0].originalOffset = 2;
        state.decodedMappings[2].originalOffset = 0;
        const result = findOriginalRange(0, 3, state, originalMap);
        assert.equal(result.error, true);
        assert.match(result.errors[0], /invalid original start > end/);
    });

    it('returns and caches the corrected CSS end, separately from the raw mapping', () => {
        const { state, originalMap } = createMapping('a{}', 'a {\n}\n');
        state.decodedMappings[1].originalOffset = 2;
        state.decodedMappings[2].originalOffset = 3;
        const raw = findOriginalRange(0, 3, state, originalMap);
        assert.equal(raw.end, 4);
        const options = {
            fixOriginalRange: true
        };
        const result = findOriginalRange(0, 3, state, originalMap, options);
        assert.ok(!result.error);
        assert.equal(result.end, 5);
        assert.strictEqual(findOriginalRange(0, 3, state, originalMap, options), result);
        assert.strictEqual(findOriginalRange(0, 3, state, originalMap), raw);
        assert.equal(raw.end, 4);
    });

    it('repairs the full CSS rule end after retrying a cross-source closing brace', () => {
        const { state, originalMap } = createMapping('a;}', 'a;\n}\n');
        state.decodedMappings[2].sourceIndex = 1;
        const result = findOriginalRange(0, 3, state, originalMap, {
            fixOriginalRange: true
        });
        assert.ok(!result.error);
        assert.equal(result.start, 0);
        assert.equal(result.end, 4);
    });
});
