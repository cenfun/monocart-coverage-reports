const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
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
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-map-comment-'));
    try {
        const { sourceList, sourcemapList } = await collectSourceMaps([{
            type: 'js', id: 'test', url: 'http://localhost/app.js', source
        }], {
            cacheDir, ... options
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

    it('ignores fake directives in regexp classes and templates', async () => {
        const source = 'const re = /[/*# sourceMappingURL=ghost.js.map*/]/;\nconst text = `\n//# sourceMappingURL=ghost.js.map\n`;\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, []);
        assert.ok(!sourceData.sourceMap);
        assert.equal(sourceData.source, source);
    });

    it('does not treat a directive quoted inside another comment as an annotation', async () => {
        const source = '/* Example:\n//# sourceMappingURL=ghost.js.map\n*/\n';
        const requested = [];
        const { sourceData } = await collect(source, {
            sourceMapResolver: (url) => {
                requested.push(url);
                return map;
            }
        });
        assert.deepEqual(requested, []);
        assert.ok(!sourceData.sourceMap);
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
