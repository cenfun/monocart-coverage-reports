import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    createMarkdownRenderer, createServer, disposeMdItInstance
} from 'vitepress';
import {
    renderTypeDeclarations, typeDeclarations, typeDeclarationsReload
} from '../../docs/.vitepress/type-declarations.js';

const projectDir = fileURLToPath(new URL('../../', import.meta.url));
const source = fs.readFileSync(path.join(projectDir, 'lib/index.d.ts'), 'utf8');

const fixture = [
    'declare namespace MCR {',
    '    /** Original result comment. */',
    '    export type CoverageResults = {',
    '        /** Keep member comments and strings containing braces. */',
    '        value: "}" | "export interface Fake {}";',
    '        nested: { count: number };',
    '    };',
    '    export interface CoverageReportOptions { result?: CoverageResults; }',
    '    export class CoverageReport { constructor(options?: CoverageReportOptions); }',
    '    /** First overload. */',
    '    export function getSnapshot(value: string): string;',
    '    /** Second overload. */',
    '    export function getSnapshot(value: number): number;',
    '    export const Util: { replacement: "$&"; fence: "```" };',
    '    interface Internal { hidden: true; }',
    '}',
    '/** Factory comment. */',
    'declare function MCR(options?: MCR.CoverageReportOptions): MCR.CoverageReport;',
    'export { MCR as default, MCR };',
    'export import CoverageResults = MCR.CoverageResults;',
    ''
].join('\n');

const headings = (markdown) => [... markdown.matchAll(/^## (\w+) \{#(\w+)\}$/gm)].map((match) => [match[1], match[2]]);

describe('type declaration documentation', () => {
    it('splits declarations by AST boundaries, retaining source comments and grouping overloads', () => {
        const markdown = renderTypeDeclarations(fixture);
        assert.deepEqual(headings(markdown), [
            ['CoverageResults', 'coverageresults'],
            ['CoverageReportOptions', 'coveragereportoptions'],
            ['CoverageReport', 'coveragereport'],
            ['getSnapshot', 'getsnapshot'],
            ['Util', 'util'],
            ['MCR', 'mcr']
        ]);
        assert.ok(markdown.includes('/** Original result comment. */\nexport type CoverageResults = {\n    /** Keep member comments and strings containing braces. */'));
        assert.ok(markdown.includes('    nested: { count: number };\n};\n```'));
        assert.ok(markdown.includes('/** First overload. */\nexport function getSnapshot(value: string): string;\n\n/** Second overload. */'));
        assert.ok(markdown.includes('/** Factory comment. */\ndeclare function MCR('));
        assert.ok(markdown.includes('````ts\nexport const Util: { replacement: "$&"; fence: "```" };\n````'));
        assert.ok(!markdown.includes('export import'));
        assert.ok(!markdown.includes('## Internal'));
    });

    it('covers the public API, with unique stable anchors for hooks and utility declarations', () => {
        const sections = headings(renderTypeDeclarations(source));
        const anchors = sections.map(([, anchor]) => anchor);
        assert.equal(new Set(anchors).size, anchors.length);
        for (const name of ['CoverageResults', 'V8CoverageEntry', 'CoverageReport', 'TestResults', 'MCR', 'Util', 'getSnapshot', 'diffSnapshot', 'CDPClient']) {
            assert.ok(anchors.includes(name.toLowerCase()), name);
        }
        // Every public export alias should resolve to exactly one declaration section.
        for (const [, name] of source.matchAll(/^export import (\w+) = MCR\.\w+;/gm)) {
            assert.equal(sections.filter(([title]) => title === name).length, 1, name);
        }
    });

    it('keeps documentation type links on valid anchors in the current language', () => {
        const anchors = new Set(['types', ... headings(renderTypeDeclarations(source)).map(([, anchor]) => anchor)]);
        const docsDir = path.join(projectDir, 'docs');
        let count = 0;
        for (const file of fs.readdirSync(docsDir, {
            recursive: true
        })) {
            if (!file.endsWith('.md')) {
                continue;
            }
            const markdown = fs.readFileSync(path.join(docsDir, file), 'utf8');
            const prefix = file.replaceAll('\\', '/').startsWith('zh/') ? '/zh' : '';
            for (const [, route, anchor] of markdown.matchAll(/\]\((\/(?:zh\/)?reference\/types)#([a-z0-9-]+)\)/g)) {
                assert.equal(route, `${prefix}/reference/types`, file);
                assert.ok(anchors.has(anchor), `${file}: #${anchor}`);
                count += 1;
            }
        }
        assert.ok(count > 0);
    });

    it('watches declarations and invalidates the VitePress config to rebuild development search', () => {
        const sourceFile = path.join(projectDir, 'lib/index.d.ts');
        const configFile = path.join(projectDir, 'docs/.vitepress/config.js');
        const watched = [];
        const changes = [];
        const server = {
            watcher: {
                add(file) {
                    watched.push(file);
                },
                emit(event, file) {
                    changes.push([event, file]);
                }
            }
        };
        const plugin = typeDeclarationsReload();
        assert.equal(plugin.apply, 'serve');
        plugin.configureServer(server);
        assert.deepEqual(watched, [sourceFile]);
        plugin.handleHotUpdate({
            file: path.join(projectDir, 'docs/reference/options.md'), server
        });
        assert.deepEqual(changes, []);
        plugin.handleHotUpdate({
            file: sourceFile.replaceAll('\\', '/'), server
        });
        assert.deepEqual(changes, [['change', configFile]]);
        // The emitted config event must not recursively trigger another restart.
        plugin.handleHotUpdate({
            file: configFile, server
        });
        assert.equal(changes.length, 1);
    });

    it('handles empty declarations and rejects malformed source or conflicting anchors', () => {
        assert.equal(renderTypeDeclarations(''), '');
        assert.equal(renderTypeDeclarations('declare namespace MCR {}'), '');
        assert.throws(() => renderTypeDeclarations('declare namespace MCR { export type Broken = ; }'));
        assert.throws(() => renderTypeDeclarations('declare namespace MCR { export interface Result {} export interface RESULT {} }'), /Duplicate type declaration anchor: result/);
    });

    it('renders real Markdown headings, tracks includes and reads updated source without caching it', async () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-docs-types-'));
        const file = path.join(directory, 'index.d.ts');
        try {
            fs.writeFileSync(file, fixture);
            const md = await createMarkdownRenderer(path.join(projectDir, 'docs'), {
                headers: true,
                config(renderer) {
                    renderer.use(typeDeclarations, file);
                }
            });
            const env = {
                path: path.join(projectDir, 'docs/reference/types.md'), includes: []
            };
            const input = '# Types\n\n<!--@type-declarations-->\n';
            const html = md.render(input, env);
            assert.deepEqual(env.includes, [file]);
            assert.ok(html.includes('id="coverageresults"'));
            assert.ok(html.includes('language-ts'));
            assert.ok(html.includes('$&'));
            assert.ok(!html.includes('<!--@type-declarations-->'));
            assert.ok(env.headers.some((header) => header.slug === 'coverageresults'));

            fs.writeFileSync(file, 'declare namespace MCR { export interface Updated {} }');
            const updated = md.render(input, {});
            assert.ok(updated.includes('id="updated"'));
            assert.ok(!updated.includes('id="coverageresults"'));
            fs.unlinkSync(file);
            assert.ok(md.render('# Unrelated page', {}).includes('Unrelated page'));
            assert.throws(() => md.render(input, {}), /ENOENT/);
        } finally {
            disposeMdItInstance();
            fs.rmSync(directory, {
                recursive: true, force: true
            });
        }
    });

    it('rebuilds both development search indexes without retaining removed declarations', {
        timeout: 30000
    }, async (t) => {
        const scratchDir = path.join(projectDir, '.temp/scratch');
        fs.mkdirSync(scratchDir, {
            recursive: true
        });
        const directory = fs.mkdtempSync(path.join(scratchDir, 'docs-types-search-'));
        let server;
        t.after(async () => {
            await server?.close();
            disposeMdItInstance();
            fs.rmSync(directory, {
                recursive: true, force: true
            });
        });
        const sourceFile = path.join(directory, 'index.d.ts');
        const configFile = path.join(directory, '.vitepress/config.mjs');
        fs.mkdirSync(path.dirname(configFile));
        fs.writeFileSync(sourceFile, 'declare namespace MCR { export interface BeforeUpdate {} }');
        for (const locale of ['', 'zh/']) {
            const page = path.join(directory, locale, 'types.md');
            fs.mkdirSync(path.dirname(page), {
                recursive: true
            });
            fs.writeFileSync(page, '# Types\n\n<!--@type-declarations-->\n');
        }
        const pluginUrl = pathToFileURL(path.join(projectDir, 'docs/.vitepress/type-declarations.js')).href;
        fs.writeFileSync(configFile, `
import { typeDeclarations, typeDeclarationsReload } from ${JSON.stringify(pluginUrl)};
export default {
    cacheDir: './cache',
    locales: { root: { label: 'English' }, zh: { label: '简体中文' } },
    themeConfig: { search: { provider: 'local' } },
    markdown: { config(md) { md.use(typeDeclarations, ${JSON.stringify(sourceFile)}); } },
    vite: {
        optimizeDeps: { noDiscovery: true },
        plugins: [
            typeDeclarationsReload(${JSON.stringify(configFile)}, ${JSON.stringify(sourceFile)}),
            // This server only exercises search indexing, without browser dependencies.
            { name: 'skip-test-prebundling', configResolved(config) { config.optimizeDeps.include = []; } }
        ]
    }
};
`);
        const restarted = Promise.withResolvers();
        let restarting;
        const startServer = async () => {
            const current = await createServer(directory, {
                host: '127.0.0.1',
                port: 0,
                // Emit a deterministic change event below; browser smoke tests use real watching.
                watch: {
                    ignored: () => true
                }
            }, () => {
                restarting ??= (async () => {
                    await current.close();
                    await startServer();
                })().then(restarted.resolve, restarted.reject);
                return restarting;
            });
            server = current;
            await current.listen();
        };
        await startServer();
        const searchIndex = (locale) => server.pluginContainer.load(`/@localSearchIndex${locale}`);
        for (const locale of ['root', 'zh']) {
            assert.ok((await searchIndex(locale)).includes('#beforeupdate'), locale);
        }
        fs.writeFileSync(sourceFile, 'declare namespace MCR { export interface AfterUpdate {} }');
        server.watcher.emit('change', sourceFile);
        await restarted.promise;
        for (const locale of ['root', 'zh']) {
            const index = await searchIndex(locale);
            assert.ok(index.includes('#afterupdate'), locale);
            assert.ok(!index.includes('#beforeupdate'), locale);
        }
    });
});
