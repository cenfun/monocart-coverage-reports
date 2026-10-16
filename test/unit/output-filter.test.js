const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const MCR = require('../../lib/index.js');
const defaultOptions = require('../../lib/default/options.js');

const createEntry = (url, source, count = 1) => ({
    url,
    source,
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: source.length, count
        }]
    }]
});

describe('outputFilter', () => {
    let root;
    let srcDir;
    let outputDir;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-output-filter-'));
        srcDir = path.join(root, 'src');
        outputDir = path.join(root, 'reports');
        fs.mkdirSync(srcDir);
        fs.writeFileSync(path.join(srcDir, 'keep.js'), 'const keep = 1;\n');
        fs.writeFileSync(path.join(srcDir, 'drop.js'), 'const drop = 2;\n');
    });

    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    const checkFiles = (result, expected) => {
        const names = (files) => files.map((file) => path.basename(file)).sort();
        assert.deepEqual(names(result.files.map((file) => file.sourcePath)), expected);
        const v8 = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-report.json'), 'utf8'));
        assert.deepEqual(names(v8.files.map((file) => file.sourcePath)), expected);
        const istanbul = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-final.json'), 'utf8'));
        assert.deepEqual(names(Object.keys(istanbul)), expected);
        return istanbul;
    };

    const generate = (options = {}) => MCR({
        logging: 'off',
        baseDir: root,
        all: srcDir,
        outputDir,
        reports: ['v8-json', 'json'],
        ... options
    }).generate();

    it('is disabled by default', async () => {
        assert.strictEqual(defaultOptions.outputFilter, null);
        checkFiles(await generate(), ['drop.js', 'keep.js']);
    });

    it('is disabled when explicitly null', async () => {
        checkFiles(await generate({
            outputFilter: null
        }), ['drop.js', 'keep.js']);
    });

    for (const [name, outputFilter] of [
        ['glob string', '**/keep.js'],
        ['substring string', 'keep.js'],
        ['ordered object', {
            '**/drop.js': false, '**': true
        }],
        ['first matching pattern', {
            '**/keep.js': true, '**': false
        }],
        ['unmatched files excluded', {
            '**/keep.js': true
        }],
        ['JSON-like string', "{'**/drop.js':false,'**':true}"]
    ]) {
        it(`uses existing filter semantics (${name})`, async () => {
            checkFiles(await generate({
                outputFilter
            }), ['keep.js']);
        });
    }

    it('passes final file entries to a function, including untested files', async () => {
        const seen = [];
        const result = await generate({
            outputFilter: (entry) => {
                seen.push(entry.sourcePath);
                assert.ok(entry.summary);
                assert.ok(entry.data);
                return entry.sourcePath.endsWith('/keep.js');
            }
        });
        assert.deepEqual(seen.sort(), ['src/drop.js', 'src/keep.js']);
        checkFiles(result, ['keep.js']);
    });

    it('permits filtering out every file in both report formats', async () => {
        checkFiles(await generate({
            outputFilter: () => false
        }), []);
    });

    it('matches rewritten source paths', async () => {
        const result = await generate({
            sourcePath: (sourcePath) => sourcePath.replace('src/', 'renamed/'),
            outputFilter: 'renamed/keep.js'
        });
        assert.equal(result.files[0].sourcePath, 'renamed/keep.js');
        checkFiles(result, ['keep.js']);
    });

    it('filters sourcemap sources after discovery without excluding their bundle', async () => {
        const source = 'const keep = 1;\nconst drop = 2;\n';
        const report = MCR({
            logging: 'off',
            outputDir,
            reports: ['v8-json', 'json', 'json-summary'],
            entryFilter: '**/bundle.js',
            sourceFilter: '**',
            outputFilter: '**/keep.js'
        });
        await report.add([{
            ... createEntry('http://localhost/bundle.js', source),
            sourceMap: {
                version: 3,
                sources: ['src/keep.js', 'node_modules/drop.js'],
                sourcesContent: ['const keep = 1;\n', 'const drop = 2;\n'],
                names: [],
                mappings: 'AAAA;ACAA'
            }
        }]);
        const result = await report.generate();
        checkFiles(result, ['keep.js']);
        const summary = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-summary.json'), 'utf8'));
        assert.equal(result.summary.lines.pct, 100);
        assert.equal(summary.total.lines.pct, 100);
        assert.equal(summary.total.lines.total, result.summary.lines.total);
    });

    it('keeps converted Istanbul summaries consistent with the retained V8 files', async () => {
        const report = MCR({
            logging: 'off',
            outputDir,
            reports: ['v8-json', 'json', 'json-summary'],
            outputFilter: '**/keep.js'
        });
        await report.add([
            createEntry('http://localhost/keep.js', 'const keep = 1;\n'),
            createEntry('http://localhost/drop.js', 'const drop = 2;\n', 0)
        ]);
        const result = await report.generate();
        checkFiles(result, ['keep.js']);
        const summary = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-summary.json'), 'utf8'));
        assert.equal(result.summary.lines.pct, 100);
        assert.equal(summary.total.lines.pct, 100);
    });

    it('does not apply to Istanbul input', async () => {
        const report = MCR({
            logging: 'off', outputDir, reports: ['json'], outputFilter: () => false
        });
        const filePath = path.join(srcDir, 'keep.js');
        await report.add({
            [filePath]: {
                path: filePath, statementMap: {}, fnMap: {}, branchMap: {}, s: {}, f: {}, b: {}
            }
        });
        const result = await report.generate();
        assert.equal(result.files.length, 1);
    });

    ['**/keep.js', "{'**/drop.js':false,'**':true}"].forEach((outputFilter) => {
        it(`supports CLI merge with --outputFilter ${outputFilter}`, () => {
            const configPath = path.join(root, 'mcr.config.cjs');
            fs.writeFileSync(configPath, 'module.exports = {};\n');
            const result = spawnSync(process.execPath, [
                require.resolve('../../lib/cli.js'),
                'merge',
                '--config',
                configPath,
                '--logging',
                'off',
                '--all',
                srcDir,
                '--outputDir',
                outputDir,
                '--reports',
                'v8-json,json',
                '--outputFilter',
                outputFilter
            ], {
                cwd: root,
                encoding: 'utf8',
                timeout: 10000
            });
            assert.ifError(result.error);
            assert.equal(result.status, 0, result.stderr || result.stdout);
            const v8 = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-report.json'), 'utf8'));
            checkFiles(v8, ['keep.js']);
        });
    });

    it('loads without a standalone minimatch runtime dependency', () => {
        const result = spawnSync(process.execPath, ['-e', `
            const Module = require('module');
            const load = Module._load;
            Module._load = function(name, ...args) {
                if (name === 'minimatch') {
                    throw new Error('Standalone minimatch must not be required');
                }
                return load.call(this, name, ...args);
            };
            require(${JSON.stringify(require.resolve('../../lib/index.js'))});
        `], {
            encoding: 'utf8'
        });
        assert.equal(result.status, 0, result.stderr);
    });
});
