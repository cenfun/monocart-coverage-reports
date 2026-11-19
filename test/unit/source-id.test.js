import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSha1, calculateSourceCacheId } from '../../lib/utils/source-id.js';

describe('source cache references', () => {
    it('hashes captured source text and URLs without adding coverage fields', () => {
        assert.equal(calculateSha1('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
        assert.notEqual(calculateSha1('file:///one.js'), calculateSha1('file:///two.js'));
    });

    it('reuses the existing ID when no sourcemap needs a separate cache entry', () => {
        assert.equal(calculateSourceCacheId('existing-id'), 'existing-id');
        assert.equal(calculateSourceCacheId('existing-id', null), 'existing-id');
    });

    it('distinguishes sourcemap cache references without changing report identity', () => {
        const id = 'existing-id';
        const map = {
            version: 3, sources: ['one.js'], sourcesContent: ['const value = 1;'], mappings: 'AAAA'
        };
        assert.equal(calculateSourceCacheId(id, map), calculateSourceCacheId(id, structuredClone(map)));
        assert.notEqual(calculateSourceCacheId(id, map), id);
        assert.notEqual(calculateSourceCacheId(id, map), calculateSourceCacheId(id, {
            ... map, sources: ['two.js']
        }));
    });
});
