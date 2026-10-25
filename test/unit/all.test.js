import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileString } from 'sass';
import { MCR } from '../../lib/index.js';

describe('all file collection', () => {
    let root;
    let srcDir;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-all-'));
        srcDir = path.join(root, 'src');
        fs.mkdirSync(srcDir);
        fs.writeFileSync(path.join(srcDir, 'uncovered.js'), 'function uncovered() { return 42; }\n');
    });

    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    ['v8-json', 'json-summary'].forEach((reportName) => {
        it(`includes untested files with no coverage input (${reportName})`, async () => {
            const inputDir = path.join(root, 'empty-input');
            fs.mkdirSync(inputDir);
            const outputDir = path.join(root, 'reports');
            const result = await MCR({
                logging: 'off',
                all: srcDir,
                inputDir,
                outputDir,
                reports: [reportName]
            }).generate();

            assert.equal(result.type, 'v8');
            assert.equal(result.files.length, 1);
            assert.ok(result.files[0].sourcePath.endsWith('src/uncovered.js'));
            assert.equal(result.summary.lines.pct, 0);
            const reportFile = reportName === 'v8-json' ? 'coverage-report.json' : 'coverage-summary.json';
            assert.ok(fs.existsSync(path.join(outputDir, reportFile)));
        });
    });

    it('recognizes untested Less files as CSS by default', async () => {
        fs.writeFileSync(path.join(srcDir, 'unused.less'), '.unused { color: red; }\n');
        const result = await MCR({
            logging: 'off',
            all: {
                dir: srcDir, filter: (filePath) => filePath.endsWith('.less')
            },
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json']
        }).generate();

        assert.ok(result);
        assert.equal(result.files.length, 1);
        const [file] = result.files;
        assert.ok(file.sourcePath.endsWith('/unused.less'));
        assert.equal(file.js, false);
        assert.equal(file.type, 'css');
        assert.equal(file.summary.lines.pct, 0);
        assert.equal(file.summary.bytes.pct, 0);
        for (const metric of ['functions', 'branches', 'statements']) {
            assert.equal(file.summary[metric].total, 0);
        }
    });

    it('keeps sourcemapped untested Sass byte coverage at zero', async () => {
        const source = '$unused: red;\n\n.outer {\n  .a {color:red}\n}\n';
        fs.writeFileSync(path.join(srcDir, 'unused.scss'), source);
        const outputDir = path.join(root, 'reports');
        const result = await MCR({
            logging: 'off',
            all: {
                dir: srcDir,
                filter: (filePath) => filePath.endsWith('.scss'),
                transformer: (entry) => {
                    const compiled = compileString(entry.source, {
                        url: new URL(entry.url),
                        sourceMap: true,
                        sourceMapIncludeSources: true
                    });
                    entry.type = 'css';
                    entry.source = compiled.css;
                    entry.sourceMap = compiled.sourceMap;
                }
            },
            outputDir,
            reports: ['v8-json']
        }).generate();

        assert.ok(result);
        assert.ok(fs.existsSync(path.join(outputDir, 'coverage-report.json')));
        assert.equal(result.files.length, 1);
        const [file] = result.files;
        assert.ok(file.sourcePath.endsWith('/unused.scss'));
        assert.equal(file.source, source);
        assert.equal(file.empty, true);
        assert.equal(file.summary.bytes.total, source.length);
        assert.equal(file.summary.bytes.covered, 0);
        assert.equal(file.summary.bytes.pct, 0);
        assert.equal(result.summary.bytes.pct, 0);
    });

    it('does not abort report generation when untested preprocessor syntax cannot be parsed as CSS', async () => {
        // Real Less/Stylus sources are not valid CSS. Untested files must not
        // abort report generation when postcss cannot parse them.
        fs.writeFileSync(path.join(srcDir, 'unused.less'), '@color: red;\n.used {\n  .mixin();\n  color: @color;\n}\n');
        fs.writeFileSync(path.join(srcDir, 'Upper.LESS'), '@color: red;\n.used { color: @color; }\n');
        fs.writeFileSync(path.join(srcDir, 'unused.styl'), 'used\n  color red\n');
        const result = await MCR({
            logging: 'off',
            all: {
                dir: srcDir, filter: (filePath) => (/\.(less|styl)$/i).test(filePath)
            },
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json']
        }).generate();

        assert.ok(result);
        assert.deepEqual(result.files.map((file) => path.basename(file.sourcePath)).sort(), ['Upper.LESS', 'unused.less', 'unused.styl']);
        for (const file of result.files) {
            assert.equal(file.js, false);
            assert.equal(file.type, 'css');
            assert.equal(file.summary.lines.pct, 0);
            assert.equal(file.summary.bytes.pct, 0);
            for (const metric of ['functions', 'branches', 'statements']) {
                assert.equal(file.summary[metric].total, 0);
            }
        }
    });

    [false, true].forEach((covered) => {
        it(`rejects invalid collected CSS instead of using the untested-file fallback (covered: ${covered})`, async () => {
            const outputDir = path.join(root, 'reports');
            const report = MCR({
                logging: 'off',
                all: srcDir,
                outputDir,
                reports: ['v8-json']
            });
            const source = '.broken {';
            await report.add([{
                url: 'http://localhost/broken.css',
                text: source,
                ranges: covered ? [{
                    start: 0, end: source.length
                }] : []
            }]);

            await assert.rejects(report.generate(), (error) => {
                assert.match(error.message, /^parse css error in .*broken\.css$/);
                assert.ok(error.cause instanceof Error);
                assert.equal(error.cause.name, 'CssSyntaxError');
                assert.match(error.cause.reason, /Unclosed block/);
                return true;
            });
            assert.equal(fs.existsSync(path.join(outputDir, 'coverage-report.json')), false);
        });
    });

    it('permits an empty report when all has no matching files', async () => {
        const result = await MCR({
            logging: 'off',
            all: {
                dir: srcDir, filter: () => false
            },
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json']
        }).generate();

        assert.equal(result.files.length, 0);
    });

    it('preserves the no-data behavior without all', async () => {
        const outputDir = path.join(root, 'reports');
        const result = await MCR({
            logging: 'off', outputDir
        }).generate();

        assert.equal(typeof result, 'undefined');
        assert.equal(fs.existsSync(outputDir), false);
    });
});
