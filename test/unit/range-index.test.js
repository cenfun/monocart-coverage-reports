import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findContainingRange } from '../../lib/converter/range-index.js';
import { getJsAstInfo } from '../../lib/converter/ast.js';

const scan = (ranges, start, end) => ranges.findLast((range) => {
    return range.startOffset <= start && range.endOffset >= end;
});

// Seeded inputs keep this equivalence test deterministic.
const randomGenerator = () => {
    let seed = 123456789;
    return (max) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed % max;
    };
};

describe('AST containing-range index', () => {
    it('handles empty arrays and inclusive boundaries', () => {
        assert.equal(typeof findContainingRange([], 0, 1), 'undefined');
        const ranges = [{
            startOffset: 0, endOffset: 10
        }];
        assert.equal(findContainingRange(ranges, 0, 10), ranges[0]);
        assert.equal(typeof findContainingRange(ranges, -1, 10), 'undefined');
        assert.equal(typeof findContainingRange(ranges, 0, 11), 'undefined');
    });

    it('preserves last-match semantics for nested, overlapping and equal-start ranges', () => {
        const ranges = [
            {
                startOffset: 0, endOffset: 1000
            },
            ... Array.from({
                length: 40
            }, (_, i) => ({
                startOffset: Math.floor(i / 2), endOffset: 40 - i / 2
            }))
        ];
        for (let start = -1; start <= 45; start++) {
            for (let end = start; end <= 46; end++) {
                assert.equal(findContainingRange(ranges, start, end), scan(ranges, start, end));
            }
        }
        assert.equal(findContainingRange(ranges, 500, 1000), ranges[0]);
        assert.equal(typeof findContainingRange(ranges, 500, 1001), 'undefined');
    });

    it('agrees with the linear reference on randomized sorted and unsorted arrays', () => {
        const random = randomGenerator();
        for (let round = 0; round < 200; round++) {
            const ranges = Array.from({
                length: random(128)
            }, () => {
                const startOffset = random(100);
                return {
                    startOffset, endOffset: startOffset + random(100)
                };
            });
            if (round % 2 === 0) {
                ranges.sort((a, b) => a.startOffset - b.startOffset);
            }
            for (let query = 0; query < 100; query++) {
                const start = random(220) - 10;
                const end = start + random(100);
                assert.equal(findContainingRange(ranges, start, end), scan(ranges, start, end));
            }
        }
    });

    it('does not reorder custom unsorted coverage or change its winning range', () => {
        const ranges = Array.from({
            length: 40
        }, (_, i) => ({
            startOffset: 40 - i, endOffset: 100
        }));
        const original = [... ranges];
        assert.equal(findContainingRange(ranges, 50, 60), ranges[39]);
        assert.deepEqual(ranges, original);
    });

    it('reuses the index without linearly reading ranges on every query', () => {
        let reads = 0;
        const ranges = Array.from({
            length: 16384
        }, (_, i) => ({
            get startOffset() {
                reads++;
                return i * 4;
            },
            get endOffset() {
                reads++;
                return i * 4 + 2;
            }
        }));
        findContainingRange(ranges, 0, 1);
        reads = 0;
        for (let i = 0; i < 2048; i++) {
            const index = i * 7;
            assert.equal(findContainingRange(ranges, index * 4 + 1, index * 4 + 2), ranges[index]);
            // No enclosing range: a linear backwards scan is particularly costly.
            assert.equal(typeof findContainingRange(ranges, index * 4 + 2, index * 4 + 3), 'undefined');
        }
        assert.ok(reads < 70000, `Expected logarithmic range reads, got ${reads}`);
    });
});

describe('AST indexed block coverage', () => {
    const createInput = () => {
        const line = '  x += 1;\n';
        const source = line.repeat(40);
        const ranges = [
            {
                startOffset: 0, endOffset: source.length, count: 2
            },
            {
                startOffset: 0, endOffset: source.length, count: 3
            },
            ... Array.from({
                length: 40
            }, (_, i) => ({
                startOffset: i * line.length + 1,
                endOffset: i * line.length + 9,
                count: i + 4
            })),
            // Uncovered ranges win over enclosing covered ranges.
            {
                startOffset: 5 * line.length + 1, endOffset: 5 * line.length + 9, count: 0
            },
            // Exact-start matches win even if their end is shorter than the node.
            {
                startOffset: 10 * line.length + 2, endOffset: 10 * line.length + 3, count: 99
            }
        ];
        return {
            source,
            coverage: [{
                functionName: '', isBlockCoverage: true, ranges
            }]
        };
    };

    it('keeps exact-start, uncovered and last-enclosing precedence', () => {
        const { source, coverage } = createInput();
        const info = getJsAstInfo({
            source
        }, coverage);
        assert.deepEqual(info.statements.map((statement) => statement.count),
            Array.from({
                length: 40
            }, (_, i) => {
                if (i === 5) {
                    return 0;
                }
                return i === 10 ? 99 : i + 4;
            }));
    });

    it('rebuilds block indices when the same coverage objects are analyzed again', () => {
        const { source, coverage } = createInput();
        getJsAstInfo({
            source
        }, coverage);
        coverage[0].ranges[3].count = 123;
        const info = getJsAstInfo({
            source
        }, coverage);
        assert.equal(info.statements[1].count, 123);
    });
});
