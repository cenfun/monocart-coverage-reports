import {
    after, before, describe, it
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress';
import config from '../../docs/.vitepress/config.js';

const docsDir = fileURLToPath(new URL('../../docs/', import.meta.url));
const readDoc = (file) => fs.readFileSync(new URL(`../../docs/${file}`, import.meta.url), 'utf8');
let md;

before(async () => {
    md = await createMarkdownRenderer(docsDir, config.markdown);
});
after(() => disposeMdItInstance());

describe('Mermaid documentation', () => {
    it('uses strict rendering and a container separate from Mermaid automatic scanning', () => {
        assert.equal(config.mermaid.fontFamily, 'var(--vp-font-family-base)');
        assert.equal(config.mermaid.securityLevel, 'strict');
        assert.equal(config.mermaid.flowchart.htmlLabels, false);
        assert.notEqual(config.mermaidPlugin.class, 'mermaid');
    });

    it('prebundles Mermaid CommonJS layout dependencies for the development server', () => {
        for (const dependency of ['fastdom', 'fastdom/extensions/fastdom-promised.js']) {
            assert.ok(config.vite.optimizeDeps.include.includes(dependency), dependency);
        }
    });

    ['', 'zh/'].forEach((locale) => {
        it(`renders the ${locale || 'English'} workflow as a diagram with parallel collection and a completion barrier`, () => {
            const source = readDoc(`${locale}reference/multiprocessing.md`);
            const graph = source.match(/```mermaid\n([\s\S]*?)```/)[1];
            const html = md.render(source, {});
            assert.ok(html.includes('<Mermaid '));
            assert.ok(html.includes(`graph="${encodeURIComponent(graph)}"`));
            assert.ok(html.includes(`class="${config.mermaidPlugin.class}"`));
            assert.ok(!html.includes('language-mermaid'));
            assert.match(graph, /accTitle: .+/);
            assert.match(graph, /accDescr: .+/);
            const edges = [... graph.matchAll(/^\s*(\w+) --> (\w+)$/gm)].map(([, from, to]) => [from, to]);
            assert.deepEqual(edges, [
                ['init', 'worker1'],
                ['init', 'worker2'],
                ['worker1', 'cache'],
                ['worker2', 'cache'],
                ['cache', 'wait'],
                ['wait', 'report']
            ]);
        });
    });

    ['', 'zh/'].forEach((locale) => {
        it(`renders the ${locale || 'English'} test hook workflow in execution order`, () => {
            const source = readDoc(`${locale}reference/hooks.md`);
            const graph = source.match(/```mermaid\n([\s\S]*?)```/)[1];
            assert.ok(source.includes('{#test-end-workflow}'));
            const hookOrder = [... source.matchAll(/^## `(on\w+)`/gm)].map((match) => match[1]);
            assert.deepEqual(hookOrder, ['onStart', 'onTestEnd', 'onReady', 'onEntry', 'onEnd']);
            assert.ok(md.render(source, {}).includes(`graph="${encodeURIComponent(graph)}"`));
            const edges = [... graph.matchAll(/^\s*(\w+) -->\|"[^"]+"\| (\w+)$/gm)].map(([, from, to]) => [from, to]);
            assert.deepEqual(edges, [
                ['onStart', 'onTestEnd'],
                ['onTestEnd', 'onReady'],
                ['onReady', 'onEntry'],
                ['onEntry', 'onEnd']
            ]);
            assert.ok(graph.includes(locale ? 'subgraph entries["针对每个 V8 条目触发，可能执行多次"]' : 'subgraph entries["Each V8 entry / may run multiple times"]'));
            assert.match(graph, /subgraph entries[^\n]*\n\s+onEntry\["onEntry \(V8 only\)"\]\n\s+end/);
            for (const label of ['onStart (CLI only)', 'onReady (CLI only)', 'onTestEnd (mcr test only)', 'onEnd (API / CLI)']) {
                assert.ok(graph.includes(`"${label}"`), label);
            }
            assert.ok(graph.includes('onTestEnd["onTestEnd (mcr test only)"]'));
            assert.ok(!graph.includes('classDef focus'));
            assert.ok(!graph.includes('class onTestEnd focus'));
            assert.match(graph, /accTitle: .+/);
            assert.match(graph, /accDescr: .+/);
        });
    });

    it('preserves the existing generated type declaration Markdown plugin', () => {
        const html = md.render(readDoc('reference/types.md'), {});
        assert.ok(html.includes('id="coverageresults"'));
        assert.ok(html.includes('id="coverageclient"'));
    });
});
