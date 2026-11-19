import {
    describe, it, mock
} from 'node:test';
import assert from 'node:assert/strict';
import { Util } from '../../lib/utils/util.js';
import { mergeV8Coverage } from '../../lib/v8/v8.js';
import { calculateSourceCacheId } from '../../lib/utils/source-id.js';

const source = 'var value = 1;\n';

describe('saved V8 source cache references', () => {
    [false, true].forEach((mapped) => {
        [false, true].forEach((nativeTypeScript) => {
            it(`keeps saved IDs/cache references without replaying path hooks (mapped=${mapped}, native=${nativeTypeScript})`, async () => {
                const sourcePath = 'saved.js';
                const id = Util.calculateSha1(sourcePath + source);
                const sourceMap = mapped ? {
                    version: 3, names: [], sources: ['original.js'], sourcesContent: [source], mappings: 'AAAA'
                } : null;
                const cacheId = calculateSourceCacheId(id, sourceMap);
                const stored = {
                    id, source, sourceMap
                };
                const saved = {
                    id,
                    sourcePath,
                    url: 'file:///subject.ts',
                    type: 'js',
                    nativeTypeScript,
                    functions: [{
                        functionName: '',
                        isBlockCoverage: true,
                        ranges: [{
                            startOffset: 0, endOffset: source.length, count: 1
                        }]
                    }]
                };
                if (mapped) {
                    stored.sourceCacheId = cacheId;
                    saved.sourceCacheId = cacheId;
                }
                const originalStored = structuredClone(stored);
                const sourceCache = new Map([[cacheId, stored]]);
                const mergeFunctions = Util.mergeV8Coverage;
                const merged = mock.method(Util, 'mergeV8Coverage', (items) => {
                    assert.deepEqual([... sourceCache], [[cacheId, stored]]);
                    for (const item of items) {
                        assert.equal(item.id, id);
                        assert.equal(item.sourcePath, sourcePath);
                        assert.equal(sourceCache.get(item.sourceCacheId || item.id), stored);
                    }
                    return mergeFunctions(items);
                });
                try {
                    const result = await mergeV8Coverage([{
                        type: 'v8', data: [structuredClone(saved), structuredClone(saved)]
                    }], sourceCache, {
                        baseDir: '/different-base',
                        sourcePath: () => {
                            throw new Error('saved runtime paths must not be rewritten');
                        }
                    });
                    assert.equal(merged.mock.callCount(), 1);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].id, id);
                    assert.equal(result[0].source, source);
                    assert.equal(result[0].sourceMap, sourceMap);
                    assert.equal(result[0].functions[0].ranges[0].count, 2);
                    assert.equal(sourceCache.size, 0);
                    assert.deepEqual(stored, originalStored);
                } finally {
                    merged.mock.restore();
                }
            });
        });
    });
});
