import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCssBytes } from '../../lib/converter/css-coverage.js';

describe('CSS byte coverage union', () => {
    it('handles empty inputs and ignores empty ranges', () => {
        assert.deepEqual(mergeCssBytes([]), []);
        assert.deepEqual(mergeCssBytes([[], [{
            start: 2, end: 2, count: 1
        }]]), []);
    });

    it('splits partially covered ranges and preserves unmapped gaps', () => {
        const groups = [[{
            start: 0, end: 10, count: 0
        }], [{
            start: 3, end: 7, count: 1
        }, {
            start: 12, end: 15, count: 0
        }]];
        const original = structuredClone(groups);
        const expected = [{
            start: 0, end: 3, count: 0
        }, {
            start: 3, end: 7, count: 1
        }, {
            start: 7, end: 10, count: 0
        }, {
            start: 12, end: 15, count: 0
        }];
        assert.deepEqual(mergeCssBytes(groups), expected);
        assert.deepEqual(mergeCssBytes([... groups].reverse()), expected);
        assert.deepEqual(groups, original);
    });

    it('coalesces touching covered ranges without covering an adjacent unused range', () => {
        assert.deepEqual(mergeCssBytes([[{
            start: 2, end: 4, count: 2
        }, {
            start: 4, end: 6, count: 1
        }], [{
            start: 0, end: 6, count: 0
        }]]), [{
            start: 0, end: 2, count: 0
        }, {
            start: 2, end: 6, count: 1
        }]);
    });

    it('handles ordered, disjoint frozen ranges without mutating inputs', () => {
        const groups = [[{
            start: 0, end: 2, count: 2
        }, {
            start: 2, end: 4, count: 0
        }, {
            start: 6, end: 8, count: 1
        }], [{
            start: 3, end: 5, count: 1
        }]];
        for (const ranges of groups) {
            ranges.forEach(Object.freeze);
            Object.freeze(ranges);
        }
        Object.freeze(groups);
        const result = mergeCssBytes(groups);
        assert.deepEqual(result, [{
            start: 0, end: 2, count: 1
        }, {
            start: 2, end: 3, count: 0
        }, {
            start: 3, end: 5, count: 1
        }, {
            start: 6, end: 8, count: 1
        }]);
    });

    it('normalizes unordered and empty ranges instead of using the fast path', () => {
        assert.deepEqual(mergeCssBytes([[{
            start: 5, end: 7, count: 1
        }, {
            start: 3, end: 3, count: 1
        }, {
            start: 0, end: 2, count: 0
        }, {
            start: 9, end: 8, count: 0
        }]]), [{
            start: 0, end: 2, count: 0
        }, {
            start: 5, end: 7, count: 1
        }]);
    });

    it('does not bypass normalization when range bounds cannot be ordered', () => {
        assert.deepEqual(mergeCssBytes([[{
            start: Number.NaN, end: 10, count: 1
        }], [{
            start: 2, end: 4, count: 0
        }]]), [{
            start: 2, end: 4, count: 0
        }]);
    });

    it('preserves uncovered children within each bundle and is idempotent', () => {
        const group = [{
            start: 0, end: 10, count: 1
        }, {
            start: 3, end: 7, count: 0
        }];
        const expected = [{
            start: 0, end: 3, count: 1
        }, {
            start: 3, end: 7, count: 0
        }, {
            start: 7, end: 10, count: 1
        }];
        assert.deepEqual(mergeCssBytes([group]), expected);
        assert.deepEqual(mergeCssBytes([group, group]), expected);
        assert.deepEqual(mergeCssBytes([group, [{
            start: 4, end: 6, count: 1
        }]]), [{
            start: 0, end: 3, count: 1
        }, {
            start: 3, end: 4, count: 0
        }, {
            start: 4, end: 6, count: 1
        }, {
            start: 6, end: 7, count: 0
        }, {
            start: 7, end: 10, count: 1
        }]);
    });

    it('agrees with a per-bundle per-byte union for randomized overlapping ranges', () => {
        let seed = 138;
        const random = (max) => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed % max;
        };
        for (let round = 0; round < 100; round++) {
            const groups = Array.from({
                length: random(5)
            }, () => Array.from({
                length: random(15)
            }, () => {
                const start = random(30);
                return {
                    start, end: start + random(10), count: random(2)
                };
            }));
            const merged = mergeCssBytes(groups);
            for (let offset = 0; offset < 40; offset++) {
                const counts = groups.map((ranges) => {
                    const matches = ranges.filter((range) => range.start <= offset && offset < range.end);
                    if (matches.length) {
                        return Number(matches.every((range) => range.count > 0));
                    }
                }).filter((count) => typeof count === 'number');
                let expected;
                if (counts.length) {
                    expected = Math.max(... counts);
                }
                const actual = merged.find((range) => range.start <= offset && offset < range.end);
                assert.equal(actual?.count, expected);
            }
            assert.deepEqual(mergeCssBytes([... groups, ... groups]), merged);
            assert.deepEqual(mergeCssBytes([... groups].reverse()), merged);
        }
    });
});
