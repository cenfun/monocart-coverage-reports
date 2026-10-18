import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encode } from '@jridgewell/sourcemap-codec';
import { handleUncoveredInCovered } from '../../lib/converter/fake-source-coverage.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';

const createState = (bytes, metadata = bytes) => ({
    bytes,
    statements: metadata.map((range) => ({
        ... range
    })),
    branches: metadata.map((range) => ({
        ... range
    })),
    functions: metadata.map((range) => ({
        ... range
    }))
});

const reference = (state, originalStateMap) => {
    if (!state.fake) {
        return;
    }
    originalStateMap.forEach((originalState) => {
        const { bytes } = originalState;
        const removed = [];
        originalState.bytes = bytes.filter((item) => {
            if (item.count === 0 && bytes.find((range) => {
                return range.count !== 0 && !(range.start > item.end) && !(range.end < item.start);
            })) {
                removed.push(item);
                return false;
            }
            return true;
        });
        removed.forEach((item) => {
            for (const key of ['statements', 'branches', 'functions']) {
                originalState[key] = originalState[key].filter((range) => {
                    return range.start !== item.start || range.end !== item.end;
                });
            }
        });
    });
};

const apply = (state) => handleUncoveredInCovered({
    fake: true
}, new Map([[0, state]]));

describe('fake source overlapping coverage', () => {
    it('leaves non-fake state and all array identities unchanged', () => {
        const state = createState([
            {
                start: 0, end: 20, count: 1
            }, {
                start: 5, end: 10, count: 0
            }
        ]);
        const arrays = {
            ... state
        };
        handleUncoveredInCovered({
            fake: false
        }, new Map([[0, state]]));
        for (const key of Object.keys(arrays)) {
            assert.equal(state[key], arrays[key]);
        }
    });

    it('handles empty, all-covered and all-uncovered inputs', () => {
        for (const bytes of [[], [{
            start: 0, end: 10, count: 1
        }], [{
            start: 0, end: 10, count: 0
        }]]) {
            const state = createState(bytes);
            const expected = structuredClone(state);
            const metadata = state.statements;
            apply(state);
            assert.deepEqual(state, expected);
            assert.equal(state.statements, metadata);
        }
    });

    it('retains uncovered ranges with no overlap and does not refilter metadata', () => {
        const state = createState([
            {
                start: 0, end: 5, count: 1
            }, {
                start: 6, end: 10, count: 0
            }
        ]);
        const expected = structuredClone(state);
        const arrays = [state.statements, state.branches, state.functions];
        apply(state);
        assert.deepEqual(state, expected);
        assert.deepEqual([state.statements, state.branches, state.functions], arrays);
        assert.equal(state.statements, arrays[0]);
        assert.equal(state.branches, arrays[1]);
        assert.equal(state.functions, arrays[2]);
    });

    it('preserves inclusive endpoint overlaps and non-zero covered counts', () => {
        const state = createState([
            {
                start: 10, end: 20, count: -1
            },
            {
                start: 0, end: 10, count: 0
            },
            {
                start: 20, end: 30, count: 0
            },
            {
                start: 21, end: 31, count: 0
            }
        ]);
        apply(state);
        assert.deepEqual(state.bytes, [
            {
                start: 10, end: 20, count: -1
            }, {
                start: 21, end: 31, count: 0
            }
        ]);
        assert.deepEqual(state.statements, state.bytes);
    });

    it('handles unsorted nested coverage and deletes only exact metadata matches', () => {
        const uncovered = {
            start: 50, end: 60, count: 0
        };
        const outer = {
            start: 0, end: 100, count: 1
        };
        const inner = {
            start: 10, end: 20, count: 2
        };
        const state = createState([uncovered, inner, outer], [
            uncovered,
            {
                ... uncovered
            },
            {
                start: 49, end: 60, count: 0
            },
            {
                start: 50, end: 61, count: 0
            }
        ]);
        const original = [... state.bytes];
        apply(state);
        assert.deepEqual(state.bytes, [inner, outer]);
        assert.equal(state.bytes[0], inner);
        assert.equal(state.bytes[1], outer);
        assert.deepEqual(original, [uncovered, inner, outer]);
        for (const key of ['statements', 'branches', 'functions']) {
            assert.deepEqual(state[key], [
                {
                    start: 49, end: 60, count: 0
                }, {
                    start: 50, end: 61, count: 0
                }
            ]);
        }
    });

    it('keeps removal decisions isolated between original files', () => {
        const uncovered = {
            start: 5, end: 10, count: 0
        };
        const first = createState([uncovered, {
            start: 0, end: 20, count: 1
        }]);
        const second = createState([{
            ... uncovered
        }]);
        handleUncoveredInCovered({
            fake: true
        }, new Map([[0, first], [1, second]]));
        assert.equal(first.bytes.length, 1);
        assert.equal(second.bytes.length, 1);
        assert.deepEqual(second.statements, [uncovered]);
    });

    it('agrees with the original algorithm on randomized bytes and duplicate metadata', () => {
        let seed = 135791357;
        const random = (max) => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed % max;
        };
        for (let round = 0; round < 300; round++) {
            const states = new Map(Array.from({
                length: 1 + random(4)
            }, (_, file) => {
                const bytes = Array.from({
                    length: random(60)
                }, () => {
                    const start = random(300);
                    return {
                        start, end: start + random(30), count: random(3) - 1
                    };
                });
                const extra = Array.from({
                    length: 10
                }, () => {
                    const start = random(300);
                    return {
                        start, end: start + random(30), count: 0
                    };
                });
                return [file, createState(bytes, [... bytes, ... bytes, ... extra])];
            }));
            const expected = structuredClone(states);
            const state = {
                fake: round % 5 !== 0
            };
            reference(state, expected);
            handleUncoveredInCovered(state, states);
            assert.deepEqual(states, expected);
        }
    });

    it('filters each metadata array once and avoids quadratic range reads', () => {
        let reads = 0;
        const ranges = Array.from({
            length: 4096
        }, (_, i) => ({
            get start() {
                reads++;
                return i * 4;
            },
            get end() {
                reads++;
                return i * 4 + 2;
            },
            count: 0
        }));
        const state = createState(ranges.flatMap((range, i) => [range, {
            start: i * 4 + 1, end: i * 4 + 3, count: 1
        }]));
        reads = 0;
        let filters = 0;
        const countFilters = function(handler) {
            filters++;
            return Array.prototype.filter.call(this, handler);
        };
        for (const key of ['statements', 'branches', 'functions']) {
            state[key].filter = countFilters;
        }
        apply(state);
        assert.equal(filters, 3);
        assert.ok(reads < 200000, `Expected subquadratic range reads, got ${reads}`);
        assert.equal(state.bytes.length, ranges.length);
        assert.equal(state.statements.length, ranges.length);
    });
});

const createFakeEntry = () => {
    const lines = ['function one() { return 1; }', 'function two() { return 2; }'];
    const source = `${lines.join('\n')}\n`;
    return {
        id: 'fake',
        type: 'js',
        sourcePath: 'compiled.ts',
        url: 'http://localhost/compiled.ts',
        fake: true,
        source: `${lines.map((line) => '*'.repeat(line.length)).join('\n')}\n`,
        sourceMap: {
            version: 3,
            sources: ['original.ts'],
            sourcesContent: [source],
            names: [],
            mappings: encode(lines.map((line, row) => Array.from({
                length: line.length
            }, (_, column) => [column, 0, row, column])))
        },
        functions: [
            {
                functionName: '',
                isBlockCoverage: true,
                ranges: [{
                    startOffset: 0, endOffset: source.length, count: 1
                }]
            },
            {
                functionName: 'one',
                isBlockCoverage: true,
                ranges: [{
                    startOffset: 0, endOffset: lines[0].length, count: 0
                }]
            },
            {
                functionName: 'two',
                isBlockCoverage: true,
                ranges: [{
                    startOffset: lines[0].length + 1, endOffset: source.length - 1, count: 1
                }]
            }
        ]
    };
};

it('removes fake uncovered bytes and their matching Istanbul/V8 metadata during conversion', async () => {
    const result = await convertV8List([createFakeEntry()], {
        ... defaultOptions
    });
    assert.equal(result.v8DataList.length, 1);
    const [file] = result.v8DataList;
    assert.equal(file.sourcePath, 'original.ts');
    for (const key of ['bytes', 'functions', 'branches', 'statements']) {
        assert.ok(file.data[key].length > 0);
        assert.ok(file.data[key].every((range) => range.count !== 0), key);
    }
    const istanbul = result.coverageData['original.ts'];
    assert.ok(Object.keys(istanbul.s).length > 0);
    assert.ok(Object.values(istanbul.s).every((count) => count !== 0));
    assert.ok(Object.values(istanbul.f).every((count) => count !== 0));
    assert.ok(Object.values(istanbul.b).every((counts) => counts.every((count) => count !== 0)));
});
