const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const acorn = require('acorn');
const { convertSourceMap } = require('../../lib/packages/monocart-coverage-vendor.js');
const { collectSourceMaps } = require('../../lib/converter/collect-source-maps.js');
const MCR = require('../../lib/index.js');

const embedded = [
    'function css(v, map) {',
    '  if (map) v += `',
    '/*# sourceMappingURL=data:application/json;base64,`.concat(btoa(JSON.stringify(map)), " */"); return v;',
    '}',
    'console.log(css("a{}", null));',
    ''
].join('\n');

const map = {
    version: 3, sources: ['original.js'], sourcesContent: ['let a = 1;'], names: [], mappings: 'AAAA'
};
const inline = convertSourceMap.fromObject(map).toComment();

const collect = async (source, options = {}) => {
    const { sourceMap, ... collectOptions } = options;
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-comment-'));
    try {
        const { sourceList, sourcemapList } = await collectSourceMaps([{
            type: 'js', id: 'test', url: 'http://localhost/app.js', source, sourceMap
        }], {
            cacheDir, ... collectOptions
        });
        return {
            sourceData: sourceList[0], sourcemapList
        };
    } finally {
        fs.rmSync(cacheDir, {
            recursive: true, force: true
        });
    }
};

describe('source map comments (issue #129)', () => {
    it('does not remove directive-shaped text from template literals', async () => {
        const { sourceData, sourcemapList } = await collect(embedded);
        assert.equal(sourceData.source, embedded);
        assert.ok(!sourceData.sourceMap);
        assert.deepEqual(sourcemapList, []);
        acorn.parse(sourceData.source, {
            ecmaVersion: 'latest'
        });
    });

    it('ignores the original invalid embedded annotation before a real external map', async () => {
        const source = `${embedded}\n//# sourceMappingURL=app.js.map\n`;
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.equal(sourceData.source, source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('preserves V8 offsets when generating reports', async () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-report-'));
        try {
            const report = MCR({
                logging: 'off', outputDir, reports: ['v8-json', 'json']
            });
            await report.add([{
                url: 'http://localhost/app.js',
                scriptId: '1',
                source: embedded,
                functions: [{
                    functionName: '',
                    isBlockCoverage: false,
                    ranges: [{
                        startOffset: 0, endOffset: embedded.length, count: 1
                    }]
                }]
            }]);
            const result = await report.generate();
            assert.equal(result.files[0].source, embedded);
            assert.ok(fs.existsSync(path.join(outputDir, 'coverage-report.json')));
            assert.ok(fs.existsSync(path.join(outputDir, 'coverage-final.json')));
        } finally {
            fs.rmSync(outputDir, {
                recursive: true, force: true
            });
        }
    });

    it('preserves the source of untested files', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-all-'));
        try {
            const srcDir = path.join(root, 'src');
            fs.mkdirSync(srcDir);
            const source = `${embedded}\n${inline}\n`;
            fs.writeFileSync(path.join(srcDir, 'app.js'), source);
            const result = await MCR({
                logging: 'off', all: srcDir, outputDir: path.join(root, 'reports'), reports: ['v8-json']
            }).generate();
            assert.equal(result.files[0].source, source);
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });

    it('reads real inline source map comments without changing the source', async () => {
        const source = `const a = 1;\r\n${inline}\r\nconst b = 2;\r\n`;
        const { sourceData } = await collect(source);
        assert.equal(sourceData.source, source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('reads real block-style inline comments', async () => {
        const source = `const a = 1;\n${convertSourceMap.fromObject(map).toComment({
            multiline: true
        })}\n`;
        const { sourceData } = await collect(source);
        assert.equal(sourceData.source, source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('ignores fake inline maps in strings and loads a real external map', async () => {
        const source = `const text = ${JSON.stringify(inline)};\n//# sourceMappingURL=app.js.map\n`;
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.equal(sourceData.source, source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('can select a valid map mentioned in a regexp or template (known trade-off)', async () => {
        const source = 'const re = /[/*# sourceMappingURL=ghost.js.map*/]/;\nconst text = `\n//# sourceMappingURL=ghost.js.map\n`;\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/ghost.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourceData.source, source);
    });

    it('can select a valid inline map inside a template (known trade-off)', async () => {
        const fakeMap = {
            ... map, sources: ['ghost.js']
        };
        const fakeInline = convertSourceMap.fromObject(fakeMap).toComment();
        const source = `//# sourceMappingURL=app.js.map\nconst text = \`\n${fakeInline}\n\`;\n`;
        const requested = [];
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, []);
        assert.deepEqual(sourceData.sourceMap.sources, ['ghost.js']);
        assert.equal(sourcemapList[0].inline, true);
    });

    it('can select a valid map mentioned inside another comment (known trade-off)', async () => {
        const source = '/* Example:\n//# sourceMappingURL=ghost.js.map\n*/\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/ghost.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('finds external maps after standalone CR and Unicode line terminators', async () => {
        for (const separator of ['\r', '\u2028', '\u2029', '\r\n']) {
            const source = `// header${separator}//# sourceMappingURL=app.js.map${separator}`;
            const requested = [];
            const { sourceData, sourcemapList } = await collect(source, {
                sourceMapResolver: (url) => {
                    requested.push(url);
                    return map;
                }
            });
            assert.equal(sourceData.source, source);
            assert.deepEqual(requested, ['http://localhost/app.js.map'], JSON.stringify(separator));
            assert.deepEqual(sourceData.sourceMap.sources, map.sources);
            assert.equal(sourcemapList[0].sourceMapUrl, requested[0]);
        }
    });

    it('still detects comments after unsupported JavaScript syntax', async () => {
        const source = '@dec class A {}\n//# sourceMappingURL=app.js.map\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });
});

describe('source map candidate fallback', () => {
    it('prefers an explicitly supplied valid map over inline and external directives', async () => {
        const explicitMap = {
            ... map, sources: ['supplied.js']
        };
        const source = `${inline}\n//# sourceMappingURL=app.js.map\n`;
        const requested = [];
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMap: explicitMap,
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.strictEqual(sourceData.sourceMap, explicitMap);
        assert.deepEqual(requested, []);
        assert.deepEqual(sourcemapList, []);
        assert.equal(sourceData.source, source);
    });

    it('falls back to an inline map when the supplied map lacks required fields', async () => {
        const source = `${inline}\n`;
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMap: {
                sources: ['invalid.js']
            }
        });
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].inline, true);
    });

    it('falls back to an external map when the supplied map is invalid and no inline map exists', async () => {
        const source = '//# sourceMappingURL=app.js.map\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMap: {
                sources: ['invalid.js']
            },
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('discards an invalid supplied map when no directive is available', async () => {
        const { sourceData, sourcemapList } = await collect('const a = 1;', {
            sourceMap: {
                sources: ['invalid.js']
            }
        });
        assert.ok(!sourceData.sourceMap);
        assert.deepEqual(sourcemapList, []);
    });

    it('uses the last of multiple valid inline maps', async () => {
        const first = convertSourceMap.fromObject(map).toComment();
        const lastMap = {
            ... map, sources: ['last.js']
        };
        const last = convertSourceMap.fromObject(lastMap).toComment();
        const { sourceData, sourcemapList } = await collect(`${first}\n${last}\n`);
        assert.deepEqual(sourceData.sourceMap.sources, ['last.js']);
        assert.equal(sourcemapList[0].inline, true);
    });

    it('falls back to an earlier inline map when the last one is invalid', async () => {
        const invalid = convertSourceMap.fromObject({
            sources: ['invalid.js']
        }).toComment();
        const source = `${inline}\n${invalid}\n`;
        const { sourceData, sourcemapList } = await collect(source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourceData.source, source);
        assert.equal(sourcemapList[0].inline, true);
    });

    it('tries earlier inline maps before falling back to an external map', async () => {
        const invalid = convertSourceMap.fromObject({
            sources: ['invalid.js']
        }).toComment();
        const source = `${inline}\n${invalid}\n//# sourceMappingURL=app.js.map\n`;
        const requested = [];
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, []);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].inline, true);
    });

    it('uses the last valid external map', async () => {
        const source = '//# sourceMappingURL=first.js.map\n//# sourceMappingURL=last.js.map\n';
        const requested = [];
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/last.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].sourceMapUrl, requested[0]);
    });

    it('preserves 2.13.0 inline precedence over a later external map', async () => {
        const source = `${inline}\n//# sourceMappingURL=app.js.map\n`;
        const requested = [];
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, []);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].inline, true);
    });

    it('falls back to an external map when the last inline map is invalid JSON', async () => {
        const source = '//# sourceMappingURL=app.js.map\nconst text = `\n//# sourceMappingURL=data:application/json;base64,bad\n`;\n';
        const requested = [];
        const { sourceData, sourcemapList } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourceData.source, source);
        assert.equal(sourcemapList[0].sourceMapUrl, requested[0]);
    });

    it('falls back to an external map when the last inline map is not a sourcemap', async () => {
        const invalidInline = convertSourceMap.fromObject({
            foo: 'bar'
        }).toComment();
        const source = `//# sourceMappingURL=app.js.map\n${invalidInline}\n`;
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('falls back past an external map that cannot be loaded or is invalid', async () => {
        const source = '//# sourceMappingURL=app.js.map\n//# sourceMappingURL=missing.js.map\n//# sourceMappingURL=invalid.js.map\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                if (url.endsWith('/invalid.js.map')) {
                    return {
                        version: 3, sources: ['original.js']
                    };
                }
                if (url.endsWith('/missing.js.map')) {
                    return;
                }
                return map;
            }
        });
        assert.deepEqual(requested, [
            'http://localhost/invalid.js.map',
            'http://localhost/missing.js.map',
            'http://localhost/app.js.map'
        ]);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('falls back when a map references a source index outside its sources array', async () => {
        const source = 'const a = 1;\n//# sourceMappingURL=good.js.map\n//# sourceMappingURL=bad.js.map\n';
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-index-'));
        const requested = [];
        try {
            const report = MCR({
                logging: 'off',
                outputDir,
                reports: ['json'],
                sourceMapResolver: (url) => {
                    requested.push(url);
                    return url.endsWith('/bad.js.map') ? {
                        version: 3, sources: [], sourcesContent: [], mappings: 'AAAA'
                    } : map;
                }
            });
            await report.add([{
                url: 'http://localhost/app.js',
                scriptId: '1',
                source,
                functions: [{
                    functionName: '',
                    isBlockCoverage: false,
                    ranges: [{
                        startOffset: 0, endOffset: source.length, count: 1
                    }]
                }]
            }]);
            await report.generate();
            assert.deepEqual(requested, ['http://localhost/bad.js.map', 'http://localhost/good.js.map']);
            assert.ok(fs.existsSync(path.join(outputDir, 'coverage-final.json')));
        } finally {
            fs.rmSync(outputDir, {
                recursive: true, force: true
            });
        }
    });

    it('rejects maps with mappings but no sources, including indexed maps', async () => {
        const invalidMap = {
            version: 3, sources: [], sourcesContent: [], mappings: 'AAAA'
        };
        const indexedMap = {
            version: 3,
            sections: [{
                offset: {
                    line: 0, column: 0
                },
                map: invalidMap
            }]
        };
        for (const sourceMap of [invalidMap, indexedMap]) {
            const { sourceData, sourcemapList } = await collect(`${inline}\n`, {
                sourceMap
            });
            assert.deepEqual(sourceData.sourceMap.sources, map.sources);
            assert.equal(sourcemapList[0].inline, true);
        }
    });

    it('does not crash on an out-of-range source index found during conversion', async () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-bad-index-'));
        const source = 'const a = 1;';
        try {
            const report = MCR({
                logging: 'off',
                outputDir,
                reports: ['json']
            });
            await report.add([{
                url: 'http://localhost/app.js',
                scriptId: '1',
                source,
                sourceMap: {
                    version: 3,
                    sources: ['original.js'],
                    sourcesContent: ['const a = 1;'],
                    // Refers to source index 1, which does not exist.
                    mappings: 'ACAA'
                },
                functions: [{
                    functionName: '',
                    isBlockCoverage: false,
                    ranges: [{
                        startOffset: 0, endOffset: source.length, count: 1
                    }]
                }]
            }]);
            await report.generate();
            assert.ok(fs.existsSync(path.join(outputDir, 'coverage-final.json')));
        } finally {
            fs.rmSync(outputDir, {
                recursive: true, force: true
            });
        }
    });

    it('rejects missing required fields and unusable source entries before falling back', async () => {
        const missingMappings = {
            version: 3, sources: ['original.js'], sourcesContent: ['bad']
        };
        const invalidSources = {
            version: 3, sources: [null], sourcesContent: ['bad'], mappings: 'AAAA'
        };
        const source = `//# sourceMappingURL=app.js.map\n${convertSourceMap.fromObject(missingMappings).toComment()}\n${convertSourceMap.fromObject(invalidSources).toComment()}\n`;
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/app.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('accepts maps without a version or with nonstandard optional metadata', async () => {
        for (const version of [null, 'custom']) {
            const looseMap = {
                sources: map.sources,
                sourcesContent: map.sourcesContent,
                mappings: map.mappings,
                names: null
            };
            if (version) {
                looseMap.version = version;
            }
            const source = `${convertSourceMap.fromObject(looseMap).toComment()}\n`;
            const { sourceData } = await collect(source);
            assert.deepEqual(sourceData.sourceMap.sources, map.sources);
            assert.deepEqual(sourceData.sourceMap.names, []);
        }
    });

    it('loads missing source content despite malformed optional sourcesContent', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-content-'));
        try {
            const originalFile = path.join(root, 'original.js');
            fs.writeFileSync(originalFile, 'const original = 1;');
            const looseMap = {
                version: 3,
                sources: [pathToFileURL(originalFile).toString()],
                sourcesContent: null,
                names: null,
                mappings: 'AAAA'
            };
            const { sourceData } = await collect(`${convertSourceMap.fromObject(looseMap).toComment()}\n`);
            assert.deepEqual(sourceData.sourceMap.sourcesContent, ['const original = 1;']);
            assert.deepEqual(sourceData.sourceMap.names, []);
        } finally {
            fs.rmSync(root, {
                recursive: true, force: true
            });
        }
    });

    it('resolves nested indexed maps', async () => {
        const nestedMap = {
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
                        map: {
                            ... map
                        }
                    }]
                }
            }]
        };
        const source = `${convertSourceMap.fromObject(nestedMap).toComment()}\n`;
        const { sourceData } = await collect(source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
    });

    it('keeps source entries in input order when a map loads asynchronously', async () => {
        const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-order-'));
        try {
            const { sourceList } = await collectSourceMaps([{
                type: 'js',
                id: 'first',
                url: 'http://localhost/first.js',
                source: '//# sourceMappingURL=first.js.map\n'
            }, {
                type: 'js',
                id: 'second',
                url: 'http://localhost/second.js',
                source: 'const x = 1;'
            }], {
                cacheDir,
                sourceMapResolver: () => Promise.resolve(map)
            });
            assert.deepEqual(sourceList.map((item) => item.id), ['first', 'second']);
            assert.deepEqual(sourceList[0].sourceMap.sources, map.sources);
        } finally {
            fs.rmSync(cacheDir, {
                recursive: true, force: true
            });
        }
    });

    it('skips empty inline maps with or without sourcesContent', async () => {
        for (const sourcesContent of [undefined, []]) {
            const emptyMap = {
                version: 3, sources: [], names: [], mappings: ''
            };
            if (sourcesContent) {
                emptyMap.sourcesContent = sourcesContent;
            }
            const emptyInline = convertSourceMap.fromObject(emptyMap).toComment();
            const { sourceData, sourcemapList } = await collect(`${inline}\n${emptyInline}\n`);
            assert.deepEqual(sourceData.sourceMap.sources, map.sources);
            assert.equal(sourcemapList.length, 1);
            assert.equal(sourcemapList[0].inline, true);

            const noFallback = await collect(`${emptyInline}\n`);
            assert.ok(!noFallback.sourceData.sourceMap);
            assert.deepEqual(noFallback.sourcemapList, []);
        }
    });

    it('skips empty supplied and external maps to try other candidates', async () => {
        const emptyMap = {
            version: 3, sources: [], sourcesContent: [], names: [], mappings: ''
        };
        const requested = [];
        const { sourceData, sourcemapList } = await collect('//# sourceMappingURL=app.js.map\n//# sourceMappingURL=empty.js.map\n', {
            sourceMap: emptyMap,
            sourceMapResolver: (url) => {
                requested.push(url);
                return url.endsWith('/empty.js.map') ? emptyMap : map;
            }
        });
        assert.deepEqual(requested, ['http://localhost/empty.js.map', 'http://localhost/app.js.map']);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].sourceMapUrl, requested[1]);
    });

    it('skips fully empty indexed maps but keeps one with a useful section', async () => {
        const emptySection = {
            offset: { line: 0, column: 0 },
            map: { version: 3, sources: [], names: [], mappings: '' }
        };
        for (const sections of [[], [emptySection]]) {
            const emptyIndexed = convertSourceMap.fromObject({ version: 3, sections }).toComment();
            const { sourceData } = await collect(`${inline}\n${emptyIndexed}\n`);
            assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        }

        const indexedMap = {
            version: 3,
            sections: [emptySection, {
                offset: { line: 1, column: 0 },
                map
            }]
        };
        const { sourceData, sourcemapList } = await collect(`${convertSourceMap.fromObject(indexedMap).toComment()}\n`);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].inline, true);
    });
});

describe('source map comments after regexp quotes (issue #131)', () => {
    const patterns = [
        ["/'/", 'single quote'],
        ['/"/', 'double quote'],
        ["/[']/", 'quote in character class'],
        [String.raw`/[.[\]'"]/`, 'react-hook-form character class']
    ];

    for (const [pattern, name] of patterns) {
        it(`loads an external map after a regexp with ${name}`, async () => {
            const source = `const re = ${pattern};\n//# sourceMappingURL=app.js.map\n`;
            const requested = [];
            const { sourceData, sourcemapList } = await collect(source, {
                sourceMapResolver: (url) => {
                    requested.push(url);
                    return map;
                }
            });
            assert.equal(sourceData.source, source);
            assert.deepEqual(requested, ['http://localhost/app.js.map']);
            assert.deepEqual(sourceData.sourceMap.sources, map.sources);
            assert.equal(sourcemapList[0].sourceMapUrl, requested[0]);
        });
    }

    it('loads an inline map after a regexp with a quote', async () => {
        const source = `const re = /'/;\n${inline}\n`;
        const { sourceData, sourcemapList } = await collect(source);
        assert.equal(sourceData.source, source);
        assert.deepEqual(sourceData.sourceMap.sources, map.sources);
        assert.equal(sourcemapList[0].inline, true);
    });
});
