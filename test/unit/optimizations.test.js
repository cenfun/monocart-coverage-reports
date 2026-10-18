import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';
import { Util } from '../../lib/utils/util.js';
import { defaultOptions } from '../../lib/default/options.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { InfoStatement } from '../../lib/converter/info-statement.js';
import { InfoFunction } from '../../lib/converter/info-function.js';
import { InfoBranch } from '../../lib/converter/info-branch.js';

const source = 'function answer(value) { return value ? 1 : 0; }\nanswer(true);\n';
const createEntry = () => ({
    id: 'subject',
    type: 'js',
    sourcePath: 'subject.js',
    url: 'http://localhost/subject.js',
    source,
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: source.length, count: 1
        }]
    }]
});

describe('compiled filters', () => {
    const values = [
        'src/a.js',
        'src/a.ts',
        '/project/node_modules/a.js',
        '/project/src/nested/a.js',
        '/project/src/a%20b.js',
        '/project/src/.hidden.js',
        '',
        'literal[1].js'
    ];

    for (const pattern of ['*', '**', '**/*.js', '**/src/**', 'a b.js', 'src/', '*.ts', 'literal[1].js', '!**/*.ts', '{src,test}/**']) {
        it(`preserves betterMinimatch semantics for ${pattern}`, () => {
            const filter = Util.createFilterHandler(pattern, (item) => item.url);
            // Repeat to exercise reuse of the compiled instance.
            for (let i = 0; i < 3; i++) {
                for (const value of values) {
                    assert.equal(filter({
                        url: value
                    }), Util.betterMinimatch(value, pattern), value);
                }
            }
        });
    }

    it('preserves ordered rules, non-boolean results and unmatched values', () => {
        const rules = {
            '**/node_modules/**': false, '**/*.js': 'js', '**/*.ts': 'ts'
        };
        const filter = Util.createFilterHandler(rules, (value) => value);
        assert.equal(filter('/project/node_modules/a.js'), false);
        assert.equal(filter('/project/src/a.js'), 'js');
        assert.equal(filter('/project/src/a.ts'), 'ts');
        assert.equal(typeof filter('/project/readme.md'), 'undefined');
        rules['**/*.js'] = 'changed';
        assert.equal(filter('/project/src/a.js'), 'changed');
    });

    it('retains callback identity, JSON-like rules and lazy substring matching', () => {
        const callback = () => 'css';
        assert.equal(Util.createFilterHandler(callback, (value) => value), callback);
        const filter = Util.createFilterHandler("{'**/*.ts':false,'**':true}", (value) => value);
        assert.equal(filter('src/a.ts'), false);
        assert.equal(filter('src/a.js'), true);
        // Minimatch rejects overly long patterns, but substring matching never needs it.
        const literal = 'x'.repeat(70000);
        assert.equal(Util.createFilterHandler(literal, (value) => value)(literal), true);
    });

    it('preserves URI decoding errors when no earlier match succeeds', () => {
        const filter = Util.createFilterHandler('**/*.js', (value) => value);
        assert.throws(() => filter('bad%uri.txt'), URIError);
        assert.equal(filter('bad%uri.js'), true);
    });
});

describe('Dirent file traversal', () => {
    let root;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-dirent-'));
        fs.mkdirSync(path.join(root, 'nested'));
        fs.writeFileSync(path.join(root, 'a.js'), '');
        fs.writeFileSync(path.join(root, 'b.txt'), '');
        fs.writeFileSync(path.join(root, 'nested', 'c.js'), '');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const visit = (extensions = []) => {
        const files = [];
        Util.forEachFile(root, extensions, (name, dir) => {
            files.push(Util.formatPath(path.relative(root, path.join(dir, name))));
        });
        return files;
    };

    it('visits files before subdirectories without explicit lstat calls', () => {
        const original = fs.lstatSync;
        fs.lstatSync = () => {
            throw new Error('Unexpected per-entry lstatSync');
        };
        try {
            assert.deepEqual(visit(), ['a.js', 'b.txt', 'nested/c.js']);
        } finally {
            fs.lstatSync = original;
        }
    });

    it('preserves extension, exact filename, missing directory and break behavior', () => {
        assert.deepEqual(visit(['.js']), ['a.js', 'nested/c.js']);
        assert.deepEqual(visit(['b.txt']), ['b.txt']);
        Util.forEachFile(path.join(root, 'missing'), [], () => assert.fail('Missing directory'));
        const names = [];
        Util.forEachFile(root, [], (name) => {
            names.push(name);
            return 'break';
        });
        assert.deepEqual(names, ['a.js']);
    });

    it('does not follow directory symlinks', (t) => {
        try {
            fs.symlinkSync(path.join(root, 'nested'), path.join(root, 'linked'), 'junction');
        } catch (error) {
            if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
                t.skip();
                return;
            }
            throw error;
        }
        assert.deepEqual(visit(), ['a.js', 'b.txt', 'nested/c.js']);
    });
});

describe('optional Istanbul location maps', () => {
    let root;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-conversion-'));
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    it('retains the full public converter result by default and identical V8 data when disabled', async () => {
        const options = {
            ... defaultOptions
        };
        const full = await convertV8List([createEntry()], options);
        const v8 = await convertV8List([createEntry()], options, false);
        assert.deepEqual(v8.v8DataList, full.v8DataList);
        assert.deepEqual(v8.coverageData, {});
        assert.deepEqual(v8.fileSources, {});
        assert.equal(full.fileSources['subject.js'], source);
        assert.ok(Object.keys(full.coverageData['subject.js'].statementMap).length);
        assert.ok(Object.keys(full.coverageData['subject.js'].fnMap).length);
        assert.ok(Object.keys(full.coverageData['subject.js'].branchMap).length);
    });

    it('does not generate Istanbul maps for V8-only reports and retains mixed-report output', async () => {
        const classes = [InfoStatement, InfoFunction, InfoBranch];
        const original = classes.map((Class) => Class.prototype.generate);
        let calls = 0;
        classes.forEach((Class, i) => {
            Class.prototype.generate = function(... args) {
                calls++;
                return original[i].apply(this, args);
            };
        });
        const generate = async (reports, dir) => {
            const mcr = MCR({
                logging: 'off', outputDir: path.join(root, dir), reports
            });
            await mcr.add([createEntry()]);
            return mcr.generate();
        };
        try {
            const v8 = await generate(['v8-json'], 'v8');
            assert.equal(calls, 0);
            const mixed = await generate(['v8-json', 'json'], 'mixed');
            assert.ok(calls > 0);
            assert.deepEqual(v8.files, mixed.files);
            assert.deepEqual(v8.summary, mixed.summary);
            const json = JSON.parse(fs.readFileSync(path.join(root, 'mixed/coverage-final.json'), 'utf8'));
            assert.equal(Object.keys(json).length, 1);
            assert.ok(Object.keys(Object.values(json)[0].statementMap).length);
        } finally {
            classes.forEach((Class, i) => {
                Class.prototype.generate = original[i];
            });
        }
    });

    it('uses compiled all filters without losing file type results', async () => {
        const srcDir = path.join(root, 'src');
        fs.mkdirSync(srcDir);
        fs.writeFileSync(path.join(srcDir, 'subject.js'), source);
        fs.writeFileSync(path.join(srcDir, 'style.css'), 'body { color: red; }');
        fs.writeFileSync(path.join(srcDir, 'skip.txt'), 'not code');
        const result = await MCR({
            logging: 'off',
            outputDir: path.join(root, 'all'),
            reports: ['v8-json'],
            all: {
                dir: srcDir,
                filter: {
                    '**/*.css': 'css', '**/*.js': 'js'
                }
            }
        }).generate();
        assert.deepEqual(result.files.map((file) => file.type).sort(), ['css', 'js']);
    });

    ['v8', 'istanbul'].forEach((type) => {
        it(`round-trips merged and zipped ${type} raw reports`, async () => {
            const outputDir = path.join(root, type);
            const report = MCR({
                logging: 'off',
                outputDir,
                reports: [['raw', {
                    merge: true, zip: true
                }]]
            });
            if (type === 'v8') {
                await report.add([createEntry()]);
            } else {
                const file = path.join(root, 'subject.js');
                fs.writeFileSync(file, source);
                await report.add({
                    [file]: {
                        path: file,
                        statementMap: {
                            '0': {
                                start: {
                                    line: 1, column: 0
                                },
                                end: {
                                    line: 1, column: 10
                                }
                            }
                        },
                        fnMap: {},
                        branchMap: {},
                        s: {
                            '0': 1
                        },
                        f: {},
                        b: {}
                    }
                });
            }
            await report.generate();
            const zip = path.join(outputDir, 'raw.zip');
            assert.ok(fs.statSync(zip).size > 0);
            const result = await MCR({
                logging: 'off',
                inputDir: zip,
                outputDir: path.join(root, `${type}-merged`),
                reports: [type === 'v8' ? 'v8-json' : 'json']
            }).generate();
            assert.equal(result.files.length, 1);
            assert.equal(result.type, type);
        });
    });

    ['v8', 'both'].forEach((type) => {
        it(`retains custom ${type} reporters`, async () => {
            const reporter = path.join(root, 'reporter.mjs');
            fs.writeFileSync(reporter, `
                import assert from 'node:assert/strict';
                export default class Reporter {
                    async generate(data) {
                        assert.equal(data.type, 'v8');
                        assert.equal(data.files.length, 1);
                        assert.ok(data.files[0].data.statements.length);
                    }
                }
            `);
            const report = MCR({
                logging: 'off',
                outputDir: path.join(root, 'custom'),
                reports: [[pathToFileURL(reporter).href, {
                    type
                }]]
            });
            await report.add([createEntry()]);
            const result = await report.generate();
            assert.equal(result.files.length, 1);
        });
    });
});
