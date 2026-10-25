import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encode } from '@jridgewell/sourcemap-codec';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';

const source = 'const value = flag ? 1 : 2;\nfunction unused() { return 3; }\n';

const createSourceMap = (sourcePath, content) => ({
    version: 3,
    sources: [sourcePath],
    sourcesContent: [content],
    names: [],
    mappings: encode(content.split('\n').map((line, row) => Array.from({
        length: line.length
    }, (_, column) => [column, 0, row, column])))
});

const createJsBundle = (name, sourcePath, uncoveredValue = '2') => ({
    id: name,
    type: 'js',
    sourcePath: `${name}.js`,
    url: `http://localhost/${name}.js`,
    source,
    sourceMap: createSourceMap(sourcePath, source),
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: source.length, count: 1
        }, {
            startOffset: source.indexOf(uncoveredValue),
            endOffset: source.indexOf(uncoveredValue) + 1,
            count: 0
        }]
    }, {
        functionName: 'unused',
        isBlockCoverage: true,
        ranges: [{
            startOffset: source.indexOf('function'), endOffset: source.length - 1, count: 0
        }]
    }]
});

const convert = (entries, options = {}) => convertV8List(entries, {
    ... defaultOptions,
    ... options
});

const getCoverage = (result, sourcePath) => {
    assert.equal(result.v8DataList.length, 1);
    const [file] = result.v8DataList;
    assert.equal(file.sourcePath, sourcePath);
    const { path, ... istanbul } = result.coverageData[sourcePath];
    assert.equal(path, sourcePath);
    return {
        js: file.js,
        summary: file.summary,
        data: file.data,
        istanbul
    };
};

const jsSources = ['shared.js', 'shared.ts', 'shared.es6', 'shared.es', 'shared.coffee', 'shared.html', 'shared.txt', 'shared', 'shared.vue', 'shared.svelte', 'shared.JS', 'shared.TS', 'shared.VUE'];

describe('sourcemap source types', () => {
    for (const sourcePath of jsSources) {
        it(`preserves JS metrics for non-CSS source ${sourcePath}`, async () => {
            const expected = getCoverage(await convert([createJsBundle('control', 'shared.js')]), 'shared.js');
            const actual = getCoverage(await convert([createJsBundle('bundle', sourcePath)]), sourcePath);

            assert.equal(actual.js, true);
            assert.equal(actual.summary.functions.total, 1);
            assert.equal(actual.summary.functions.covered, 0);
            assert.equal(actual.summary.branches.total, 2);
            assert.equal(actual.summary.branches.covered, 1);
            assert.ok(actual.summary.statements.total > 0);
            assert.ok(Object.keys(actual.istanbul.statementMap).length > 0);
            assert.deepEqual(actual, expected);
        });

        it(`merges complementary JS coverage for ${sourcePath} in either input order`, async () => {
            const expected = getCoverage(await convert([
                createJsBundle('first', 'shared.js', '1'),
                createJsBundle('second', 'shared.js', '2')
            ]), 'shared.js');

            for (const reverse of [false, true]) {
                const entries = [createJsBundle('first', sourcePath, '1'), createJsBundle('second', sourcePath, '2')];
                if (reverse) {
                    entries.reverse();
                }
                const actual = getCoverage(await convert(entries), sourcePath);
                assert.equal(actual.summary.branches.covered, 2);
                assert.equal(actual.summary.lines.covered, 1);
                assert.deepEqual(actual, expected);
            }
        });
    }

    it('preserves JS source filtering without CSS exclusion bookkeeping', async () => {
        const expected = getCoverage(await convert([createJsBundle('control', 'shared.js')]), 'shared.js');
        const createEntry = () => {
            const entry = createJsBundle('bundle', 'shared.js');
            for (let i = 0; i < 1000; i++) {
                entry.sourceMap.sources.push(`dependency-${i}.js`);
                entry.sourceMap.sourcesContent.push('const dependency = 1;');
            }
            return entry;
        };
        const retained = await convert([createEntry()], {
            sourceFilter: (sourcePath) => sourcePath === 'shared.js'
        });
        assert.deepEqual(getCoverage(retained, 'shared.js'), expected);
        const excluded = await convert([createEntry()], {
            sourceFilter: () => false
        });
        assert.deepEqual(excluded.v8DataList, []);
        assert.deepEqual(excluded.coverageData, {});
    });

    it('preserves JS metrics and merging after sourcePath changes the extension', async () => {
        const expected = getCoverage(await convert([
            createJsBundle('first', 'shared.js', '1'), createJsBundle('second', 'shared.js', '2')
        ]), 'shared.js');
        const actual = getCoverage(await convert([
            createJsBundle('first', 'shared.js', '1'), createJsBundle('second', 'shared.js', '2')
        ], {
            sourcePath: (filePath) => filePath.replace(/\.js$/, '.custom')
        }), 'shared.custom');
        assert.deepEqual(actual, expected);
    });

    for (const type of ['css', 'less', 'sass', 'scss', 'styl', 'stylus', 'postcss', 'pcss', 'sss', 'CSS', 'SCSS', 'Less', 'Stylus']) {
        it(`keeps CSS whitelist source .${type} out of JS metrics`, async () => {
            const content = '.used { color: red; }\n.unused { color: blue; }\n';
            const sourcePath = `original.${type}`;
            const result = await convert([{
                id: `style-${type}`,
                type: 'css',
                sourcePath: 'bundle.css',
                url: 'http://localhost/bundle.css',
                source: content,
                sourceMap: createSourceMap(sourcePath, content),
                ranges: [{
                    start: 0, end: content.indexOf('\n')
                }]
            }]);
            const actual = getCoverage(result, sourcePath);
            assert.equal(actual.js, false);
            for (const metric of ['functions', 'branches', 'statements']) {
                assert.equal(actual.summary[metric].total, 0);
                assert.deepEqual(actual.data[metric], []);
            }
            assert.deepEqual(actual.istanbul.statementMap, {});
            assert.ok(actual.data.bytes.some((range) => range.count === 0));
            assert.ok(actual.data.bytes.some((range) => range.count > 0));
        });
    }
});
