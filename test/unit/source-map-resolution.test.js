import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import convertSourceMap from 'convert-source-map';
import { collectSourceMaps, resolveSourceMap } from '../../lib/converter/collect-source-maps.js';
import { MCR } from '../../lib/index.js';

const js = 'const original = 1;';
const css = '.unused {color: red;}';
const createMap = (sources, extra = {}) => ({
    version: 3, sources, names: [], mappings: 'AAAA', ... extra
});

describe('source map source-content resolution', () => {
    let root;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-resolution-'));
        fs.mkdirSync(path.join(root, 'dist/maps'), {
            recursive: true
        });
        fs.mkdirSync(path.join(root, 'src'));
        fs.writeFileSync(path.join(root, 'src/original.js'), js);
        fs.writeFileSync(path.join(root, 'src/original.css'), css);
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const collect = async (map, options = {}) => {
        const { inline, ... rest } = options;
        const mapFile = path.join(root, 'dist/maps/app.js.map');
        fs.writeFileSync(mapFile, JSON.stringify(map));
        const comment = inline ? convertSourceMap.fromObject(map).toComment() : '//# sourceMappingURL=maps/app.js.map';
        const { sourceList } = await collectSourceMaps([{
            id: 'entry',
            type: 'js',
            url: pathToFileURL(path.join(root, 'dist/app.js')).href,
            source: `${js}\n${comment}`
        }], {
            cacheDir: path.join(root, 'cache'), ... rest
        });
        return sourceList[0].sourceMap;
    };

    it('resolves external sources relative to the map file instead of the generated file', async () => {
        fs.writeFileSync(path.join(root, 'dist/maps/original.js'), js);
        fs.writeFileSync(path.join(root, 'dist/original.js'), 'wrong source');
        const map = await collect(createMap(['original.js']));
        assert.deepEqual(map.sourcesContent, [js]);
        assert.deepEqual(map.sources, ['original.js']);
    });

    it('resolves sources in parent directories of an external map', async () => {
        const map = await collect(createMap(['../../src/original.js']));
        assert.deepEqual(map.sourcesContent, [js]);
    });

    for (const sourceRoot of ['../../src', '../../src/']) {
        it(`applies the external map's sourceRoot (${sourceRoot}) when loading content`, async () => {
            const map = await collect(createMap(['original.js'], {
                sourceRoot
            }));
            assert.deepEqual(map.sourcesContent, [js]);
            // Loading must not rewrite the paths later passed to sourcePath.
            assert.deepEqual(map.sources, ['original.js']);
            assert.equal(map.sourceRoot, sourceRoot);
        });
    }

    it('keeps inline source roots relative to the generated file', async () => {
        const map = await collect(createMap(['original.js'], {
            sourceRoot: '../src'
        }), {
            inline: true
        });
        assert.deepEqual(map.sourcesContent, [js]);
    });

    it('supports absolute sourceRoot URLs and absolute sources without prefixing them twice', async () => {
        const file = pathToFileURL(path.join(root, 'src/original.js')).href;
        const sourceRoot = pathToFileURL(path.join(root, 'src')).href;
        const map = await collect(createMap(['original.js', file], {
            sourceRoot, mappings: 'AAAA;ACAA'
        }));
        assert.deepEqual(map.sourcesContent, [js, js]);
    });

    it('uses the external map URL with custom sourceMapResolver results too', async () => {
        const requested = [];
        const map = await collect(createMap(['../../src/original.js']), {
            sourceMapResolver: (url) => {
                requested.push(url);
                return createMap(['../../src/original.js']);
            }
        });
        assert.deepEqual(map.sourcesContent, [js]);
        assert.deepEqual(requested, [pathToFileURL(path.join(root, 'dist/maps/app.js.map')).href]);
    });

    it('resolves each nested indexed section using its own sourceRoot', async () => {
        const map = await collect({
            version: 3,
            sections: [{
                offset: {
                    line: 0, column: 0
                },
                map: {
                    version: 3,
                    sections: [{
                        offset: {
                            line: 0, column: 0
                        },
                        map: createMap(['original.js'], {
                            sourceRoot: '../../src'
                        })
                    }]
                }
            }]
        });
        assert.deepEqual(map.sourcesContent, [js]);
    });

    it('retains embedded content and resolves only missing entries', () => {
        const map = createMap(['embedded.js', 'original.js'], {
            sourceRoot: '../src', sourcesContent: ['embedded source', null]
        });
        const resolved = resolveSourceMap(map, pathToFileURL(path.join(root, 'dist/app.js')).href);
        assert.deepEqual(resolved.sourcesContent, ['embedded source', js]);
    });

    [['js', js], ['css', css]].forEach(([type, content]) => {
        [false, true].forEach((rooted) => {
            it(`generates original ${type} coverage from an external map without sourcesContent (sourceRoot: ${rooted})`, async () => {
                const filename = `original.${type}`;
                const map = createMap([rooted ? filename : `../../src/${filename}`], rooted ? {
                    sourceRoot: '../../src'
                } : {});
                fs.writeFileSync(path.join(root, `dist/maps/app.${type}.map`), JSON.stringify(map));
                const source = `${content}\n/*# sourceMappingURL=maps/app.${type}.map */`;
                const entry = {
                    url: pathToFileURL(path.join(root, `dist/app.${type}`)).href
                };
                if (type === 'css') {
                    entry.text = source;
                    entry.ranges = [];
                } else {
                    entry.source = source;
                    entry.functions = [{
                        functionName: '',
                        isBlockCoverage: true,
                        ranges: [{
                            startOffset: 0, endOffset: source.length, count: 0
                        }]
                    }];
                }
                const report = MCR({
                    logging: 'off', reports: ['v8-json'], outputDir: path.join(root, 'report')
                });
                await report.add([entry]);
                const result = await report.generate();
                assert.ok(result);
                assert.equal(result.files.length, 1);
                const [file] = result.files;
                assert.equal(path.basename(file.sourcePath), filename);
                assert.equal(file.source, content);
                assert.equal(file.js, type === 'js');
                assert.equal(file.summary.bytes.uncovered, content.length);
                assert.equal(file.summary.lines.pct, 0);
                assert.ok(fs.existsSync(path.join(root, 'report/coverage-report.json')));
            });
        });
    });
});
