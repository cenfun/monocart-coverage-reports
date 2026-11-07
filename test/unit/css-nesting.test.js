import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getCssAstInfo } from '../../lib/converter/ast.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';

const coverage = (source, ranges) => {
    const bytes = [];
    getCssAstInfo({
        source, ranges
    }, bytes);
    return bytes;
};

const source = '.covered{color:red;& [data=uncovered]{color:#00f}}';

describe('legacy CSS nesting compatibility', () => {
    it('keeps whole-rule accounting for both legacy and shortened parent ranges', () => {
        for (const end of [19, source.length]) {
            assert.deepEqual(coverage(source, [{
                start: 0, end
            }]), [{
                start: 0, end: source.length, count: 1
            }]);
        }
    });

    it('does not mark a rule covered unless its complete parent prefix is covered', () => {
        for (const ranges of [[], [{
            start: 0, end: 8
        }], [{
            start: 19, end: 49
        }]]) {
            assert.deepEqual(coverage(source, ranges), [{
                start: 0, end: source.length, count: 0
            }]);
        }
    });

    it('does not require trailing whitespace before a nested rule in the browser range', () => {
        const text = '.p { color:red;\n  & .unused { color:blue; }\n}';
        assert.deepEqual(coverage(text, [{
            start: 0, end: text.indexOf(';') + 1
        }]), [{
            start: 0, end: text.length, count: 1
        }]);
    });

    it('preserves full-range matching for ordinary rules', () => {
        const text = '.p{color:red}';
        for (const end of [text.length - 1, text.length]) {
            assert.deepEqual(coverage(text, [{
                start: 0, end
            }]), [{
                start: 0, end: text.length, count: Number(end === text.length)
            }]);
        }
    });

    it('produces identical sourcemapped coverage for old and new Chromium ranges', async () => {
        const fixture = new URL('../mock/css/postcss.min.css', import.meta.url);
        const results = [];
        for (const ranges of [[{
            start: 0, end: 74
        }], [{
            start: 0, end: 19
        }, {
            start: 50, end: 74
        }]]) {
            const result = await convertV8List([{
                id: 'nested',
                type: 'css',
                sourcePath: 'bundle.css',
                url: 'http://localhost/bundle.css',
                source: fs.readFileSync(fixture, 'utf8'),
                sourceMap: JSON.parse(fs.readFileSync(new URL(`${fixture}.map`), 'utf8')),
                ranges
            }], defaultOptions);
            const file = result.v8DataList.find((item) => item.sourcePath === 'test/mock/src/css/postcss.css');
            assert.ok(file);
            assert.deepEqual(file.data.lines, {
                1: 1, 2: 1, 4: 1, 5: 1, 6: 1, 7: 1
            });
            results.push(result.v8DataList.map((item) => ({
                sourcePath: item.sourcePath, data: item.data
            })));
        }
        assert.deepEqual(results[0], results[1]);
    });
});
