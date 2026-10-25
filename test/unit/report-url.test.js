import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Util from '../../src/app/utils/util.js';

const { formatUrl } = Util;

describe('report URL formatter', () => {
    it('escapes URL attribute values and link text', () => {
        const url = 'https://example.invalid/"><img src=x onerror="window.injected=1">?a=1&b=\'2\'';
        const escaped = 'https://example.invalid/&quot;&gt;&lt;img src=x onerror=&quot;window.injected=1&quot;&gt;?a=1&amp;b=&#39;2&#39;';
        assert.equal(formatUrl(url), `<a href="${escaped}" target="_blank">${escaped}</a>`);
    });

    it('does not interpret existing entities as markup', () => {
        assert.equal(formatUrl('https://example.invalid/&quot;'), '<a href="https://example.invalid/&amp;quot;" target="_blank">https://example.invalid/&amp;quot;</a>');
    });

    it('preserves ordinary URLs and empty cells', () => {
        const url = 'https://example.invalid/app.js';
        assert.equal(formatUrl(url), `<a href="${url}" target="_blank">${url}</a>`);
        for (const value of ['', null]) {
            assert.equal(formatUrl(value), value);
        }
        assert.equal(formatUrl(), void 0);
    });
});
