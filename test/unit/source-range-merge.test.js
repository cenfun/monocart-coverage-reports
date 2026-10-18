import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encode } from '@jridgewell/sourcemap-codec';
import { isUncoveredRange } from '../../lib/converter/source-range-merge.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';

const createGroup = (ranges = [], offsets = []) => ({
    groupMap: new Map(ranges.map((range) => [`${range.start}_${range.end}`, range])),
    state: {
        decodedMappings: offsets.map((originalOffset) => ({
            originalOffset
        }))
    }
});

const reference = (range, key, groups) => {
    let uncovered = true;
    groups.forEach(({ groupMap, state }) => {
        if (groupMap.has(key)) {
            return;
        }
        for (const item of groupMap.values()) {
            if (range.start >= item.start && range.end <= item.end) {
                return;
            }
        }
        const mapping = state.decodedMappings.find((item) => {
            return item.originalOffset >= range.start && item.originalOffset <= range.end;
        });
        if (mapping) {
            uncovered = false;
        }
    });
    return uncovered;
};

describe('indexed source-range merge', () => {
    it('preserves self keys, containment, missing mappings and inclusive endpoints', () => {
        const range = {
            start: 10, end: 20
        };
        const key = '10_20';
        assert.equal(isUncoveredRange(range, key, []), true);
        assert.equal(isUncoveredRange(range, key, [createGroup([range], [15])]), true);
        assert.equal(isUncoveredRange(range, key, [createGroup([{
            start: 0, end: 30
        }], [15])]), true);
        assert.equal(isUncoveredRange(range, key, [createGroup([], [])]), true);
        assert.equal(isUncoveredRange(range, key, [createGroup([], [9, 21])]), true);
        for (const offset of [10, 15, 20]) {
            assert.equal(isUncoveredRange(range, key, [createGroup([], [offset])]), false);
        }
    });

    it('does not mistake a partially overlapping uncovered range for containment', () => {
        const group = createGroup([{
            start: 0, end: 15
        }, {
            start: 15, end: 30
        }], [15]);
        assert.equal(isUncoveredRange({
            start: 10, end: 20
        }, '10_20', [group]), false);
    });

    it('handles nesting and unordered offsets without mutating input order', () => {
        const group = createGroup([
            {
                start: 40, end: 50
            }, {
                start: 0, end: 100
            }, {
                start: 10, end: 11
            }
        ], [80, 3, 30, 30, 10]);
        const ranges = [... group.groupMap.values()];
        const mappings = [... group.state.decodedMappings];
        assert.equal(isUncoveredRange({
            start: 20, end: 90
        }, '20_90', [group]), true);
        assert.equal(isUncoveredRange({
            start: 80, end: 110
        }, '80_110', [group]), false);
        assert.deepEqual([... group.groupMap.values()], ranges);
        assert.deepEqual(group.state.decodedMappings, mappings);
    });

    it('stops as soon as another group proves the range covered', () => {
        const neverRead = {
            get groupMap() {
                throw new Error('A decided query must not inspect later groups');
            }
        };
        assert.equal(isUncoveredRange({
            start: 10, end: 20
        }, '10_20', [
            createGroup([], [15]), neverRead
        ]), false);
    });

    it('agrees with the original scan for randomized groups and repeated queries', () => {
        let seed = 987654321;
        const random = (max) => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed % max;
        };
        for (let round = 0; round < 100; round++) {
            const groups = Array.from({
                length: random(6)
            }, () => createGroup(
                Array.from({
                    length: random(40)
                }, () => {
                    const start = random(200);
                    return {
                        start, end: start + random(60)
                    };
                }),
                Array.from({
                    length: random(80)
                }, () => random(300))
            ));
            for (let query = 0; query < 100; query++) {
                const start = random(320) - 10;
                const range = {
                    start, end: start + random(60)
                };
                const key = `${range.start}_${range.end}`;
                assert.equal(isUncoveredRange(range, key, groups), reference(range, key, groups));
            }
            for (const group of groups) {
                for (const [key, range] of group.groupMap) {
                    assert.equal(isUncoveredRange(range, key, groups), reference(range, key, groups));
                }
            }
        }
    });

    it('avoids full mapping reads for sparse queries that hit the bounded prefix', () => {
        let reads = 0;
        const group = {
            groupMap: new Map(),
            state: {
                decodedMappings: Array.from({
                    length: 100000
                }, (_, i) => ({
                    get originalOffset() {
                        reads++;
                        return i;
                    }
                }))
            }
        };
        for (const offset of [0, 17, 31]) {
            reads = 0;
            assert.equal(isUncoveredRange({
                start: offset, end: offset
            }, 'query', [group]), false);
            assert.equal(reads, offset + 1);
        }
    });

    it('does not build an index when a short mapping list is exhausted', () => {
        let reads = 0;
        const group = {
            groupMap: new Map(),
            state: {
                decodedMappings: Array.from({
                    length: 32
                }, (_, i) => ({
                    get originalOffset() {
                        reads++;
                        return i;
                    }
                }))
            }
        };
        for (let i = 0; i < 3; i++) {
            reads = 0;
            assert.equal(isUncoveredRange({
                start: 40, end: 50
            }, 'query', [group]), true);
            assert.equal(reads, 32);
        }
    });

    it('falls back to a reusable index for late hits in unordered mappings', () => {
        let reads = 0;
        const offsets = [... Array.from({
            length: 64
        }, (_, i) => 1000 + i), 5];
        const group = {
            groupMap: new Map(),
            state: {
                decodedMappings: offsets.map((offset) => ({
                    get originalOffset() {
                        reads++;
                        return offset;
                    }
                }))
            }
        };
        assert.equal(isUncoveredRange({
            start: 0, end: 5
        }, 'query', [group]), false);
        assert.equal(reads, 32 + offsets.length);
        reads = 0;
        assert.equal(isUncoveredRange({
            start: 1000, end: 1000
        }, 'query', [group]), false);
        assert.equal(isUncoveredRange({
            start: 6, end: 999
        }, 'query', [group]), true);
        assert.equal(reads, 0);
        assert.deepEqual(group.state.decodedMappings.map((item) => item.originalOffset), offsets);
    });

    it('builds indices only once instead of rereading every range and mapping per query', () => {
        let reads = 0;
        const ranges = Array.from({
            length: 16384
        }, (_, i) => ({
            get start() {
                reads++;
                return i * 4 + 1;
            },
            get end() {
                reads++;
                return i * 4 + 2;
            }
        }));
        const group = {
            groupMap: new Map(ranges.map((range, i) => [String(i), range])),
            state: {
                decodedMappings: Array.from({
                    length: 16384
                }, (_, i) => ({
                    get originalOffset() {
                        reads++;
                        return i * 4;
                    }
                }))
            }
        };
        // A late hit exhausts the short probe and builds the mapping index.
        const lastOffset = (16384 - 1) * 4;
        isUncoveredRange({
            start: lastOffset, end: lastOffset
        }, 'query', [group]);
        reads = 0;
        for (let i = 0; i < 2048; i++) {
            const start = i * 28;
            assert.equal(isUncoveredRange({
                start, end: start
            }, 'query', [group]), false);
            assert.equal(isUncoveredRange({
                start: start + 1, end: start + 2
            }, 'query', [group]), true);
        }
        assert.equal(reads, 0);
    });
});

const sharedSource = 'const value = flag ? 1 : 2;\n';
const createBundle = (name, uncoveredValue) => {
    const banner = `// ${name}\n`;
    const source = banner + sharedSource;
    const uncoveredStart = banner.length + sharedSource.indexOf(uncoveredValue);
    return {
        id: name,
        type: 'js',
        sourcePath: `${name}.js`,
        url: `http://localhost/${name}.js`,
        source,
        sourceMap: {
            version: 3,
            sources: ['shared.js'],
            sourcesContent: [sharedSource],
            names: [],
            mappings: encode([[], Array.from({
                length: sharedSource.length
            }, (_, column) => [column, 0, 0, column])])
        },
        functions: [{
            functionName: '',
            isBlockCoverage: true,
            ranges: [
                {
                    startOffset: 0, endOffset: source.length, count: 1
                },
                {
                    startOffset: uncoveredStart, endOffset: uncoveredStart + 1, count: 0
                }
            ]
        }]
    };
};

it('merges complementary coverage from two bundles mapped to the same source', async () => {
    const result = await convertV8List([
        createBundle('first', '1'), createBundle('second', '2')
    ], {
        ... defaultOptions
    });
    assert.equal(result.v8DataList.length, 1);
    const [file] = result.v8DataList;
    assert.equal(file.sourcePath, 'shared.js');
    assert.equal(file.summary.branches.covered, file.summary.branches.total);
    assert.equal(file.summary.statements.covered, file.summary.statements.total);
    assert.ok(file.data.bytes.every((range) => range.count > 0));
    assert.deepEqual(result.fileSources, {
        'shared.js': sharedSource
    });
    assert.ok(Object.keys(result.coverageData['shared.js'].statementMap).length > 0);
});
