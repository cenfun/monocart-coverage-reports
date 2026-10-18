import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';

const reporterSource = `
    module.exports = class Reporter {
        constructor(options) { this.options = options; }
        execute(context) {
            require('node:fs').writeFileSync(this.options.outputFile, JSON.stringify({
                dir: context.dir, hasTree: typeof context.getTree === 'function'
            }));
        }
    };
`;

describe('Istanbul custom reporter resolution', () => {
    let root;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr reporter '));
        fs.writeFileSync(path.join(root, 'package.json'), '{"type":"commonjs"}');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const generate = async (name) => {
        const outputDir = path.join(root, 'reports');
        const outputFile = path.join(root, 'custom.json');
        const subject = path.join(root, 'subject.js');
        const report = MCR({
            logging: 'off',
            outputDir,
            reports: [[name, {
                type: 'istanbul', outputFile
            }]]
        });
        await report.add({
            [subject]: {
                path: subject, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {}
            }
        });
        const results = await report.generate();
        assert.equal(results.type, 'istanbul');
        const captured = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        assert.equal(captured.dir, outputDir);
        assert.equal(captured.hasTree, true);
    };

    it('loads a CommonJS reporter with an explicit extension', async () => {
        const name = path.join(root, 'reporter.cjs');
        fs.writeFileSync(name, reporterSource);
        await generate(name);
    });

    it('imports a relative CommonJS reporter with an explicit extension', async () => {
        const name = path.join(root, 'reporter.js');
        fs.writeFileSync(name, reporterSource);
        await generate(`./${path.relative(process.cwd(), name)}`);
    });

    it('does not add CommonJS extension resolution', async () => {
        const name = path.join(root, 'reporter');
        fs.writeFileSync(`${name}.js`, reporterSource);
        await assert.rejects(generate(name), {
            code: 'ERR_MODULE_NOT_FOUND'
        });
    });

    it('does not add CommonJS directory resolution', async () => {
        const name = path.join(root, 'reporter');
        fs.mkdirSync(name);
        fs.writeFileSync(path.join(name, 'package.json'), '{"main":"index.cjs"}');
        fs.writeFileSync(path.join(name, 'index.cjs'), reporterSource);
        await assert.rejects(generate(name), {
            code: 'ERR_UNSUPPORTED_DIR_IMPORT'
        });
    });

    it('continues to load an ESM reporter', async () => {
        const name = path.join(root, 'reporter.mjs');
        fs.writeFileSync(name, `import fs from 'node:fs';
            export default class Reporter {
                constructor(options) { this.options = options; }
                execute(context) {
                    fs.writeFileSync(this.options.outputFile, JSON.stringify({
                        dir: context.dir, hasTree: typeof context.getTree === 'function'
                    }));
                }
            }
        `);
        await generate(name);
    });

    [['v8', 'mjs'], ['v8', 'cjs'], ['istanbul', 'mjs'], ['istanbul', 'cjs']].forEach(([type, extension]) => {
        it(`passes ${type} results, not two raw data formats, to a ${extension} both reporter`, async () => {
            const name = path.join(root, `both.${extension}`);
            const outputFile = path.join(root, 'both.json');
            const moduleHeader = extension === 'mjs' ? "import fs from 'node:fs'; export default" : "const fs = require('node:fs'); module.exports =";
            fs.writeFileSync(name, `${moduleHeader} class Reporter {
                    constructor(options, globalOptions) {
                        this.options = options;
                        if (!globalOptions.outputDir) throw new Error('Missing global options');
                    }
                    async generate(data) {
                        fs.writeFileSync(this.options.outputFile, JSON.stringify({
                            type: data.type, files: data.files.length,
                            hasSummary: Boolean(data.summary),
                            hasRawData: 'v8Data' in data || 'istanbulData' in data
                        }));
                    }
                }
            `);
            const report = MCR({
                logging: 'off',
                outputDir: path.join(root, 'reports'),
                reports: [[name, {
                    type: 'both', outputFile
                }], type === 'istanbul' ? 'json' : 'v8-json']
            });
            const subject = path.join(root, 'subject.js');
            if (type === 'v8') {
                const source = 'const covered = 1;';
                await report.add([{
                    url: pathToFileURL(subject).href,
                    source,
                    functions: [{
                        functionName: '',
                        isBlockCoverage: true,
                        ranges: [{
                            startOffset: 0, endOffset: source.length, count: 1
                        }]
                    }]
                }]);
            } else {
                await report.add({
                    [subject]: {
                        path: subject, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {}
                    }
                });
            }
            await report.generate();
            assert.deepEqual(JSON.parse(fs.readFileSync(outputFile, 'utf8')), {
                type, files: 1, hasSummary: true, hasRawData: false
            });
        });
    });

    it('rejects a missing local reporter', async () => {
        await assert.rejects(generate(path.join(root, 'missing')), {
            code: 'ERR_MODULE_NOT_FOUND'
        });
    });

    it('does not mask reporter initialization errors', async () => {
        const name = path.join(root, 'reporter.js');
        fs.writeFileSync(name, "throw new Error('reporter startup failed');");
        await assert.rejects(generate(name), /reporter startup failed/);
    });
});
