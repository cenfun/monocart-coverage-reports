import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encode } from '@jridgewell/sourcemap-codec';
import { compileString } from 'sass';
import { parseCss } from '../../lib/packages/monocart-coverage-converter.js';
import { MCR } from '../../lib/index.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';
import { getV8Summary } from '../../lib/v8/v8-summary.js';

const createBundle = (name, sources, ranges = []) => {
    const mappings = [];
    sources.forEach(({ source }, sourceIndex) => {
        const lines = source.split('\n');
        if (source.endsWith('\n')) {
            lines.pop();
        }
        lines.forEach((line, row) => {
            mappings.push(Array.from({
                length: line.length
            }, (_, column) => [column, sourceIndex, row, column]));
        });
    });
    return {
        id: name,
        type: 'css',
        sourcePath: `${name}.css`,
        url: `http://localhost/${name}.css`,
        source: sources.map((item) => item.source).join(''),
        ranges,
        sourceMap: {
            version: 3,
            sources: sources.map((item) => item.name),
            sourcesContent: sources.map((item) => item.source),
            names: [],
            mappings: encode(mappings)
        }
    };
};

const convert = async (entries, options = {}) => {
    const result = await convertV8List(entries, {
        ... defaultOptions,
        ... options
    });
    getV8Summary(result.v8DataList, defaultOptions.watermarks);
    return result;
};

const style = '.unused {\n  color: red;\n}\n';
const shared = '.a {color:red}\n.b {color:blue}\n';
const sharedSources = [{
    name: 'shared.css', source: shared
}];
const splitSources = [{
    name: 'keep.css', source: 'a{}\n'
}, {
    name: 'drop.css', source: 'longselector{color:blue}\n'
}];

const assertCss = (file) => {
    assert.equal(file.js, false);
    for (const metric of ['functions', 'branches', 'statements']) {
        assert.equal(file.summary[metric].total, 0);
    }
};

// Debug mode intentionally adds generated offsets; all semantic coverage
// fields, including execution counts, must still match normal mode.
const withoutDebugOffsets = (data) => JSON.parse(JSON.stringify(data, (key, value) => {
    if (key === 'generatedStart' || key === 'generatedEnd') {
        return;
    }
    return value;
}));

const apiEntry = (entry) => {
    if (entry.type === 'js') {
        return entry;
    }
    const { source, ... rest } = entry;
    return {
        ... rest, text: source
    };
};

const generate = async (entries, options = {}) => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-css-map-'));
    try {
        const report = MCR({
            logging: 'off', outputDir, reports: ['v8-json'], ... options
        });
        await report.add(entries.map(apiEntry));
        const result = await report.generate();
        assert.ok(result);
        assert.ok(fs.existsSync(path.join(outputDir, 'coverage-report.json')));
        return result;
    } finally {
        fs.rmSync(outputDir, {
            recursive: true, force: true
        });
    }
};

describe('CSS sourcemap coverage', () => {
    it('preserves exclusive rule ends and leaves an unused closing-brace line uncovered', async () => {
        const result = await convert([createBundle('bundle', [{
            name: 'original.css', source: style
        }])]);
        const [file] = result.v8DataList;
        assert.equal(file.sourcePath, 'original.css');
        assertCss(file);
        assert.deepEqual(file.data.bytes, [{
            start: 0, end: style.lastIndexOf('}') + 1, count: 0
        }]);
        assert.deepEqual(file.data.lines, {
            1: 0, 2: 0, 3: 0
        });
        assert.equal(file.summary.lines.pct, 0);
    });

    for (const source of [
        '.unused { color: red; }',
        style,
        style.trimEnd(),
        '.unused {\n  color: red;\n  // comment with }\n}\n',
        '.unused {\n  color: red;\n  /* comment with } */\n}\n',
        '.unused {\n  color: red;\n  /* first */ // second }\n}\n'
    ]) {
        for (const covered of [false, true]) {
            it(`keeps real Sass rule endpoints in bounds and includes closing braces (${JSON.stringify(source)}, covered: ${covered})`, async () => {
                const compiled = compileString(source, {
                    url: new URL('file:///original.scss'),
                    sourceMap: true,
                    sourceMapIncludeSources: true
                });
                const result = await generate([{
                    id: 'sass',
                    type: 'css',
                    url: 'http://localhost/bundle.css',
                    sourcePath: 'bundle.css',
                    source: compiled.css,
                    sourceMap: compiled.sourceMap,
                    ranges: covered ? [{
                        start: 0, end: compiled.css.length
                    }] : []
                }]);
                assert.equal(result.files.length, 1);
                const [file] = result.files;
                assert.equal(path.basename(file.sourcePath), 'original.scss');
                assertCss(file);
                assert.deepEqual(file.data.bytes, [{
                    start: 0, end: source.lastIndexOf('}') + 1, count: Number(covered)
                }]);
                assert.ok(file.summary.bytes.covered >= 0);
                assert.ok(file.summary.bytes.covered <= source.length);
                assert.equal(file.summary.lines.pct, covered ? 100 : 0);
                assert.ok(Object.values(file.data.lines).every((count) => count === Number(covered)));
            });
        }
    }

    it('does not consume an enclosing Sass brace when extending an unused nested rule', async () => {
        const source = '.used {\n  color: red;\n  .unused {\n    color: blue;\n  }\n}\n';
        const compiled = compileString(source, {
            url: new URL('file:///nested.scss'),
            sourceMap: true,
            sourceMapIncludeSources: true
        });
        const rule = parseCss(compiled.css).nodes[0];
        const result = await generate([{
            id: 'nested',
            type: 'css',
            url: 'http://localhost/nested.css',
            sourcePath: 'nested.css',
            source: compiled.css,
            sourceMap: compiled.sourceMap,
            ranges: [{
                start: rule.source.start.offset, end: rule.source.end.offset
            }]
        }]);
        assert.equal(result.files.length, 1);
        const [file] = result.files;
        assert.equal(path.basename(file.sourcePath), 'nested.scss');
        assert.deepEqual(file.data.lines, {
            1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 1
        });
        assert.equal(file.data.bytes.find((range) => range.count === 0).end, source.indexOf('}') + 1);
    });

    for (const inner of [
        '.unused { color: blue; }   ',
        '.unused {\n    color: blue; }   ',
        '.unused { color: blue; } /* trailing } */',
        '.unused { color: blue; } // trailing }'
    ]) {
        it(`keeps the outer Sass brace covered after a closed unused rule (${JSON.stringify(inner)})`, async () => {
            const source = `.used {\n  color: red;\n  ${inner}\n}\n`;
            const compiled = compileString(source, {
                url: new URL('file:///nested.scss'),
                sourceMap: true,
                sourceMapIncludeSources: true
            });
            // Preserved trailing comments can emit another .used block in Sass.
            const usedRules = parseCss(compiled.css).nodes.filter((node) => node.type === 'rule' && node.selector === '.used');
            const result = await generate([{
                id: 'nested',
                type: 'css',
                url: 'http://localhost/nested.css',
                sourcePath: 'nested.css',
                source: compiled.css,
                sourceMap: compiled.sourceMap,
                ranges: usedRules.map((rule) => ({
                    start: rule.source.start.offset, end: rule.source.end.offset
                }))
            }]);
            assert.equal(result.files.length, 1);
            const [file] = result.files;
            assert.equal(path.basename(file.sourcePath), 'nested.scss');
            const outerBraceLine = source.trimEnd().split('\n').length;
            const expectedLines = {
                1: 1, 2: 1
            };
            for (let line = 3; line < outerBraceLine; line++) {
                expectedLines[line] = 0;
            }
            expectedLines[outerBraceLine] = 1;
            assert.deepEqual(file.data.lines, expectedLines);
            const uncovered = file.data.bytes.find((range) => range.count === 0);
            assert.ok(uncovered.start <= source.indexOf('.unused'));
            assert.ok(uncovered.end >= source.indexOf('}') + 1);
            assert.ok(uncovered.end <= source.lastIndexOf('}'));
        });
    }

    it('falls back instead of accepting original offsets beyond the source', async () => {
        const entry = createBundle('bundle', [{
            name: 'original.css', source: style
        }]);
        entry.sourceMap.mappings = encode([[[0, 0, 0, style.length + 50]]]);
        const [file] = (await convert([entry])).v8DataList;
        assert.equal(file.sourcePath, 'bundle.css');
        assert.equal(file.summary.lines.pct, 0);
        assert.ok(file.data.bytes.every((range) => range.start >= 0 && range.end <= file.source.length));
    });

    it('handles sparse identity mappings without dropping closing braces', async () => {
        const entry = createBundle('bundle', [{
            name: 'original.css', source: style
        }]);
        entry.sourceMap.mappings = encode([[[0, 0, 0, 0]], [[2, 0, 1, 2]], [[0, 0, 2, 0]]]);
        const [file] = (await convert([entry])).v8DataList;
        assert.equal(file.sourcePath, 'original.css');
        assert.equal(file.summary.lines.pct, 0);
        assert.equal(file.data.bytes[0].end, style.lastIndexOf('}') + 1);
    });

    for (const name of ['scss', 'less', 'styl', 'sss', 'scss.min', 'less.min', 'styl.min', 'sss.min']) {
        it(`preserves ${name} mappings with unusable generated closing-brace positions`, async () => {
            const fixture = new URL(`../mock/css/${name}.css`, import.meta.url);
            const source = fs.readFileSync(fixture, 'utf8');
            const sourceMap = JSON.parse(fs.readFileSync(new URL(`${fixture.href}.map`), 'utf8'));
            const result = await convert([{
                id: name,
                type: 'css',
                url: fixture.href,
                sourcePath: `dist/${name}.css`,
                source,
                sourceMap,
                ranges: []
            }]);
            assert.equal(result.v8DataList.length, sourceMap.sources.length);
            for (const file of result.v8DataList) {
                assert.ok(file.sourcePath.startsWith('test/mock/src/css/'));
                assert.ok(file.data.bytes.some((range) => range.count === 0));
            }
        });
    }

    it('merges complementary coverage from different bundles in either order', async () => {
        for (const reverse of [false, true]) {
            const entries = [
                createBundle('first', sharedSources, [{
                    start: 0, end: shared.indexOf('\n')
                }]),
                createBundle('second', sharedSources, [{
                    start: shared.indexOf('.b'), end: shared.length - 1
                }])
            ];
            if (reverse) {
                entries.reverse();
            }
            const result = await generate(entries);
            assert.equal(result.files.length, 1);
            const [file] = result.files;
            assert.equal(file.sourcePath, 'shared.css');
            assertCss(file);
            assert.equal(file.summary.lines.pct, 100);
            assert.equal(file.summary.bytes.pct, 100);
            assert.ok(file.data.bytes.every((range) => range.count > 0));
        }
    });

    it('preserves nested uncovered Sass rules when identical coverage comes from two bundles', async () => {
        const source = '.outer { color:red; .inner {color:blue;} }';
        const compiled = compileString(source, {
            url: new URL('file:///original.scss'),
            sourceMap: true,
            sourceMapIncludeSources: true
        });
        const rule = parseCss(compiled.css).nodes[0];
        const createEntry = (name) => ({
            id: name,
            type: 'css',
            url: `http://localhost/${name}.css`,
            sourcePath: `${name}.css`,
            source: compiled.css,
            sourceMap: structuredClone(compiled.sourceMap),
            ranges: [{
                start: rule.source.start.offset, end: rule.source.end.offset
            }]
        });
        const single = await generate([createEntry('first')]);
        assert.equal(single.summary.lines.pct, 0);
        assert.ok(single.summary.bytes.pct < 50);
        for (const reverse of [false, true]) {
            const entries = [createEntry('first'), createEntry('second')];
            if (reverse) {
                entries.reverse();
            }
            const merged = await generate(entries);
            assert.deepEqual(merged.summary, single.summary);
        }
    });

    it('does not invent coverage when every bundle leaves a rule unused', async () => {
        const result = await convert([
            createBundle('first', sharedSources, [{
                start: 0, end: shared.indexOf('\n')
            }]),
            createBundle('second', sharedSources, [{
                start: 0, end: shared.indexOf('\n')
            }])
        ]);
        const [file] = result.v8DataList;
        assert.equal(file.summary.lines.covered, 1);
        assert.ok(file.data.bytes.some((range) => range.count === 0));
    });

    it('does not confuse identical offsets in distinct original files', async () => {
        const result = await convert([createBundle('bundle', [{
            name: 'first.css', source: 'a{}\n'
        }, {
            name: 'second.css', source: 'b{}\n'
        }], [{
            start: 0, end: 3
        }])]);
        assert.deepEqual(result.v8DataList.map((file) => file.sourcePath), ['first.css', 'second.css']);
        assert.equal(result.v8DataList[0].summary.lines.pct, 100);
        assert.equal(result.v8DataList[1].summary.lines.pct, 0);
    });
});

describe('Sass mixin sourcemap fallback', () => {
    for (const body of [
        '@include mixins.colors; display: block;',
        'display: block; @include mixins.colors; border: none;'
    ]) {
        for (const covered of [false, true]) {
            it(`falls back for interior cross-source Sass mappings (${body}, covered: ${covered})`, async () => {
                const compiled = compileString(`@use "mixins";\n.never-used { ${body} }\n`, {
                    url: new URL('file:///main.scss'),
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    importers: [{
                        canonicalize: (url) => (url === 'mixins' ? new URL('mcr-test:mixins.scss') : null),
                        load: () => ({
                            contents: '@mixin colors {\n  color: red;\n  background: blue;\n}\n',
                            syntax: 'scss'
                        })
                    }]
                });
                const createEntry = () => ({
                    id: 'bundle',
                    type: 'css',
                    url: 'http://localhost/bundle.css',
                    source: compiled.css,
                    sourceMap: structuredClone(compiled.sourceMap),
                    ranges: covered ? [{
                        start: 0, end: compiled.css.length
                    }] : []
                });
                for (const logging of ['off', 'debug']) {
                    const result = await generate([createEntry()], {
                        logging
                    });
                    assert.equal(result.files.length, 1);
                    const [file] = result.files;
                    assert.equal(file.sourcePath, 'localhost/bundle.css');
                    assert.notEqual(file.debug, true);
                    assert.deepEqual(file.data.bytes, [{
                        start: 0, end: compiled.css.length, count: Number(covered)
                    }]);
                    assert.equal(result.summary.bytes.pct, covered ? 100 : 0);
                    assert.equal(result.summary.lines.pct, covered ? 100 : 0);
                }
            });
        }
    }

    for (const body of [
        '@include colors; display: block;',
        'display: block; @include colors; border: none;'
    ]) {
        for (const covered of [false, true]) {
            it(`falls back for non-contiguous same-file Sass mixins (${body}, covered: ${covered})`, async () => {
                const source = `@mixin colors {\n  color: red;\n  background: blue;\n}\n.never-used { ${body} }\n`;
                const compiled = compileString(source, {
                    url: new URL('file:///main.scss'),
                    sourceMap: true,
                    sourceMapIncludeSources: true
                });
                for (const logging of ['off', 'debug']) {
                    const result = await generate([{
                        type: 'css',
                        url: 'http://localhost/bundle.css',
                        source: compiled.css,
                        sourceMap: structuredClone(compiled.sourceMap),
                        ranges: covered ? [{
                            start: 0, end: compiled.css.length
                        }] : []
                    }], {
                        logging
                    });
                    assert.equal(result.files.length, 1);
                    const [file] = result.files;
                    assert.equal(file.sourcePath, 'localhost/bundle.css');
                    assert.notEqual(file.debug, true);
                    assert.deepEqual(file.data.bytes, [{
                        start: 0, end: compiled.css.length, count: Number(covered)
                    }]);
                    assert.equal(result.summary.bytes.pct, covered ? 100 : 0);
                    assert.equal(result.summary.lines.pct, covered ? 100 : 0);
                }
            });
        }
    }

    it('falls back for a same-file mixin and caller on the same original line', async () => {
        const source = '@mixin colors { color: red; } .unused { @include colors; display: block; }';
        const compiled = compileString(source, {
            url: new URL('file:///main.scss'),
            sourceMap: true,
            sourceMapIncludeSources: true
        });
        const result = await generate([{
            type: 'css',
            url: 'http://localhost/bundle.css',
            source: compiled.css,
            sourceMap: compiled.sourceMap,
            ranges: []
        }]);
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].sourcePath, 'localhost/bundle.css');
        assert.equal(result.summary.bytes.pct, 0);
        assert.equal(result.summary.lines.pct, 0);
    });
});

describe('CSS sourcemap filtering and fallback', () => {
    it('preserves real coverage when merging sourcemapped empty CSS in either order', async () => {
        const createReal = () => createBundle('real', sharedSources, [{
            start: 0, end: shared.indexOf('\n')
        }]);
        const expected = (await convert([createReal()])).v8DataList.find((file) => file.sourcePath === 'shared.css');
        for (const reverse of [false, true]) {
            const empty = createBundle('empty', sharedSources);
            empty.empty = true;
            const entries = [empty, createReal()];
            if (reverse) {
                entries.reverse();
            }
            const file = (await convert(entries)).v8DataList.find((item) => item.sourcePath === 'shared.css');
            assert.notEqual(file.empty, true);
            assert.deepEqual(file.summary, expected.summary);
            assert.deepEqual(file.data, expected.data);
        }
    });

    it('skips deliberately filtered mappings without falling back to the bundle', async () => {
        const result = await generate([createBundle('bundle', splitSources, [{
            start: 0, end: 3
        }])], {
            sourceFilter: (sourcePath) => sourcePath === 'keep.css'
        });
        assert.deepEqual(result.files.map((file) => file.sourcePath), ['keep.css']);
        assert.equal(result.summary.lines.pct, 100);
    });

    for (const includeMiddle of [false, true]) {
        it(`checks interior mappings of cross-source rules (${includeMiddle ? 'retained middle source' : 'all sources excluded'})`, async () => {
            const entry = createBundle('bundle', [{
                name: 'keep.css', source: 'keep{}\n'
            }, {
                name: 'drop-a.css', source: 'a{color:red}\n'
            }, {
                name: 'drop-b.css', source: 'b{color:red}\n'
            }], [{
                start: 0, end: 6
            }]);
            entry.source = 'keep{}\na,b{color:red}\n';
            const ruleMappings = [[0, 1, 0, 0], [2, 2, 0, 0]];
            if (includeMiddle) {
                entry.sourceMap.sources.push('middle.css');
                entry.sourceMap.sourcesContent.push('color:red');
            }
            for (let column = 3; column < 14; column++) {
                const sourceIndex = includeMiddle && column === 8 ? 3 : 2;
                ruleMappings.push([column, sourceIndex, 0, column - 2]);
            }
            entry.sourceMap.mappings = encode([
                Array.from({
                    length: 6
                }, (_, column) => [column, 0, 0, column]), ruleMappings
            ]);
            const result = await generate([entry], {
                sourceFilter: (sourcePath) => sourcePath === 'keep.css' || sourcePath === 'middle.css'
            });
            if (includeMiddle) {
                // Do not silently discard a rule whose endpoints are excluded
                // but which still contains a retained mapping in the middle.
                assert.deepEqual(result.files.map((file) => file.sourcePath), ['localhost/bundle.css']);
            } else {
                assert.deepEqual(result.files.map((file) => file.sourcePath), ['keep.css']);
                assert.equal(result.summary.lines.pct, 100);
            }
        });
    }

    it('does not count a retained next rule outside the exclusive end of an excluded rule', async () => {
        const entry = createBundle('bundle', [{
            name: 'drop.css', source: 'a{}'
        }, {
            name: 'keep.css', source: 'keep{}'
        }], [{
            start: 3, end: 9
        }]);
        entry.sourceMap.mappings = encode([[[0, 0, 0, 0], [3, 1, 0, 0]]]);
        const result = await generate([entry], {
            sourceFilter: (sourcePath) => sourcePath === 'keep.css'
        });
        assert.deepEqual(result.files.map((file) => file.sourcePath), ['keep.css']);
        assert.equal(result.summary.lines.pct, 100);
    });

    it('permits excluding every original file without reintroducing the bundle', async () => {
        const result = await generate([createBundle('bundle', splitSources)], {
            sourceFilter: () => false
        });
        assert.deepEqual(result.files, []);
        assert.equal(result.summary.bytes.total, 0);
    });

    it('does not reintroduce fully excluded sources even if their map cannot be decoded into ranges', async () => {
        const entry = createBundle('bundle', splitSources);
        entry.sourceMap.mappings = encode([[[0, splitSources.length, 0, 0]]]);
        const result = await generate([entry], {
            sourceFilter: () => false
        });
        assert.deepEqual(result.files, []);
    });

    it('does not treat unavailable unfiltered source content as deliberate filtering', async () => {
        const entry = createBundle('bundle', splitSources);
        entry.sourceMap.sourcesContent[1] = null;
        const [file] = (await convert([entry])).v8DataList;
        assert.equal(file.sourcePath, 'bundle.css');
        assert.equal(file.summary.lines.pct, 0);
    });

    it('still falls back for duplicate mappings within one original file', async () => {
        const entry = createBundle('bundle', [{
            name: 'original.css', source: 'a{}\na{}\n'
        }]);
        entry.sourceMap.sourcesContent = ['a{}\n'];
        entry.sourceMap.mappings = encode([
            [[0, 0, 0, 0], [1, 0, 0, 1], [2, 0, 0, 2]],
            [[0, 0, 0, 0], [1, 0, 0, 1], [2, 0, 0, 2]]
        ]);
        const [file] = (await convert([entry])).v8DataList;
        assert.equal(file.sourcePath, 'bundle.css');
        assert.equal(file.summary.lines.pct, 0);
    });

    it('keeps valid debug-only bundles out of totals without removing original coverage', async () => {
        const createValid = () => createBundle('valid', [{
            name: 'original.css', source: style
        }]);
        const normal = await generate([createValid()]);
        const debug = await generate([createValid()], {
            logging: 'debug'
        });
        assert.deepEqual(debug.summary, normal.summary);
        assert.equal(debug.files.length, 2);
        assert.notEqual(debug.files.find((file) => file.sourcePath === 'original.css').debug, true);
        assert.equal(debug.files.find((file) => file.sourcePath.endsWith('/valid.css')).debug, true);
    });

    for (const type of ['css', 'js']) {
        it(`prefers real ${type} source coverage over its debug copy when their IDs match`, async () => {
            const source = type === 'css' ? '.unused { color: red; }\n' : 'const unused = 1;\n';
            const createEntry = (name) => {
                const entry = createBundle(name, [{
                    name: `http://localhost/same.${type}`, source
                }]);
                entry.url = `http://localhost/same.${type}`;
                if (type === 'js') {
                    entry.type = 'js';
                    delete entry.ranges;
                    entry.functions = [{
                        functionName: '',
                        isBlockCoverage: true,
                        ranges: [{
                            startOffset: 0, endOffset: source.length, count: 1
                        }]
                    }];
                }
                return entry;
            };
            const normal = await generate([createEntry('same')]);
            const debug = await generate([createEntry('same')], {
                logging: 'debug'
            });
            assert.deepEqual(debug.summary, normal.summary);
            assert.equal(debug.files.length, 1);
            assert.notEqual(debug.files[0].debug, true);
            assert.deepEqual(withoutDebugOffsets(debug.files[0].data), normal.files[0].data);
            const secondUrl = createEntry('second');
            secondUrl.url = `http://localhost/second.${type}`;
            const normalMerged = await generate([createEntry('same'), structuredClone(secondUrl)]);
            const debugMerged = await generate([createEntry('same'), secondUrl], {
                logging: 'debug'
            });
            assert.deepEqual(debugMerged.summary, normalMerged.summary);
            const realSource = normalMerged.files[0];
            const debugSource = debugMerged.files.find((file) => file.sourcePath === realSource.sourcePath);
            assert.notEqual(debugSource.debug, true);
            assert.deepEqual(withoutDebugOffsets(debugSource.data), realSource.data);
        });
    }

    it('includes fallback coverage in totals even with debug logging enabled', async () => {
        const createInvalid = () => {
            const entry = createBundle('invalid', [{
                name: 'original.css', source: style
            }]);
            entry.sourceMap.mappings = 'ACAA';
            return entry;
        };
        const normal = await generate([createInvalid()]);
        const debug = await generate([createInvalid()], {
            logging: 'debug'
        });
        assert.deepEqual(debug.summary, normal.summary);
        assert.equal(debug.files.length, 1);
        assert.notEqual(debug.files[0].debug, true);
        assert.equal(debug.summary.lines.total, 3);
    });
});
