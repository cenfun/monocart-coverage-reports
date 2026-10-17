import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { MCR } from 'monocart-coverage-reports';
import pkg from 'monocart-coverage-reports/package.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../skills/monocart-coverage-reports/', import.meta.url));
const files = fs.readdirSync(root, {
    recursive: true
}).filter((file) => file.endsWith('.md'));

const getExample = (file, marker = '') => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const blocks = [... source.matchAll(/```js\r?\n([\s\S]*?)\r?\n```/g)];
    const block = blocks.find((match) => match[1].includes(marker));
    assert.ok(block, `${file}: missing example ${marker}`);
    return block[1];
};

const loadExample = async (file, marker) => {
    const source = getExample(file, marker);
    return (await import(`data:text/javascript,${encodeURIComponent(source)}`)).default;
};

const coverageEntry = (url) => {
    const source = 'const answer = 42;\n';
    return {
        url,
        source,
        functions: [{
            functionName: '',
            isBlockCoverage: true,
            ranges: [{
                startOffset: 0, endOffset: source.length, count: 1
            }]
        }]
    };
};

const reportsGuide = 'references/reports-and-ci.md';

describe('AI agent skill', function() {
    this.timeout(30000);
    it('exposes the skill and bundled references for npm consumers', () => {
        assert.ok(pkg.files.includes('skills'));
        for (const file of files) {
            const resolved = require.resolve(`monocart-coverage-reports/skills/monocart-coverage-reports/${file.replaceAll('\\', '/')}`);
            assert.equal(resolved, path.join(root, file));
        }
        const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
        assert.match(skill, /^---\r?\nname: monocart-coverage-reports\r?\ndescription: .+\r?\n---/);
        assert.ok(files.includes('SKILL.md'));
        assert.ok(files.some((file) => file.startsWith(`references${path.sep}`) || file.startsWith('references/')));
    });

    it('keeps relative Markdown links portable with the entire skill directory', () => {
        for (const file of files) {
            const source = fs.readFileSync(path.join(root, file), 'utf8');
            for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
                const target = match[1].split('#')[0];
                if (!target || (/^[a-z]+:/i).test(target)) {
                    continue;
                }
                const resolved = path.resolve(root, path.dirname(file), target);
                const relative = path.relative(root, resolved);
                assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), `${file}: nonportable link ${target}`);
                assert.ok(fs.existsSync(resolved), `${file}: missing link ${target}`);
            }
        }
    });

    for (const [file, marker] of [
        ['SKILL.md', '// mcr.config.mjs'],
        ['references/cli.md', '// mcr.config.mjs'],
        ['references/filtering-and-sourcemaps.md', '// input-filter.config.mjs'],
        ['references/filtering-and-sourcemaps.md', '// output-filter.config.mjs']
    ]) {
        it(`limits ${file} (${marker}) to application sources without sourcemaps`, async () => {
            const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-skill-scope-'));
            try {
                const options = await loadExample(file, marker);
                const report = MCR({
                    ... options,
                    outputDir,
                    reports: ['v8-json'],
                    logging: 'off',
                    cleanCache: true
                });
                await report.add([
                    coverageEntry('https://example/src/app.js'),
                    coverageEntry('https://example/test/app.test.js'),
                    coverageEntry('https://example/node_modules/dependency/src/index.js')
                ]);
                const results = await report.generate();
                assert.deepEqual(results.files.map((entry) => entry.sourcePath), ['example/src/app.js']);
            } finally {
                fs.rmSync(outputDir, {
                    recursive: true, force: true
                });
            }
        });
    }

    it('runs the quick-start Node test and automatically writes V8 and console reports', () => {
        const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-skill-quick-start-'));
        try {
            for (const name of ['src/add.mjs', 'test/add.test.mjs']) {
                const target = path.join(cwd, name);
                fs.mkdirSync(path.dirname(target), {
                    recursive: true
                });
                fs.writeFileSync(target, getExample('SKILL.md', `// ${name}`));
            }
            const cli = fileURLToPath(new URL('../../lib/cli.js', import.meta.url));
            const run = (outputDir) => {
                const result = spawnSync(process.execPath, [
                    cli, 'test', './test/add.test.mjs', '-r', 'v8,console-summary', '-o', outputDir
                ], {
                    cwd, encoding: 'utf8', timeout: 15000
                });
                assert.ifError(result.error);
                assert.notEqual(result.status, null, result.stderr);
                assert.ok(fs.existsSync(path.join(cwd, outputDir, 'index.html')), result.stdout + result.stderr);
                assert.match(result.stdout, /Coverage %/);
                return result;
            };
            const passing = run('./coverage-reports');
            assert.equal(passing.status, 0, passing.stdout + passing.stderr);
            const testFile = path.join(cwd, 'test/add.test.mjs');
            fs.writeFileSync(testFile, fs.readFileSync(testFile, 'utf8').replace('add(2, 3), 5', 'add(2, 3), 99'));
            const failing = run('./coverage-failed');
            assert.notEqual(failing.status, 0);
        } finally {
            fs.rmSync(cwd, {
                recursive: true, force: true
            });
        }
    });

    it('generates a single HTML file with the documented inline config', async () => {
        const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-skill-inline-'));
        try {
            const options = await loadExample(reportsGuide, '// inline.config.mjs');
            const report = MCR({
                ... options, outputDir, logging: 'off', cleanCache: true
            });
            await report.add([coverageEntry('https://example/src/app.js')]);
            assert.ok(await report.generate());
            assert.deepEqual(fs.readdirSync(outputDir), ['index.html']);
        } finally {
            fs.rmSync(outputDir, {
                recursive: true, force: true
            });
        }
    });

    it('rejects stale or empty results with the documented CI scripts', async () => {
        const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-skill-ci-'));
        const outputDir = path.join(cwd, 'coverage-reports');
        const artifact = path.join(outputDir, 'coverage-report.json');
        const run = (args) => {
            const result = spawnSync(process.execPath, args, {
                cwd, encoding: 'utf8', timeout: 15000
            });
            assert.ifError(result.error);
            assert.notEqual(result.status, null, result.stderr);
            return result;
        };
        try {
            for (const name of ['clean-coverage.mjs', 'verify-coverage.mjs']) {
                fs.writeFileSync(path.join(cwd, name), getExample(reportsGuide, `// ${name}`));
            }
            const options = await loadExample(reportsGuide, '// mcr.config.mjs');
            assert.ok(options.reports.includes('v8-json'));
            const report = MCR({
                ... options, outputDir, logging: 'off', onEnd: null
            });
            await report.add([coverageEntry('https://example/src/app.js')]);
            assert.ok(await report.generate());
            assert.equal(run(['verify-coverage.mjs']).status, 0);

            // Reproduce ordinary CLI success with no collected input, after the documented cleanup.
            assert.equal(run(['clean-coverage.mjs']).status, 0);
            assert.equal(fs.existsSync(artifact), false);
            fs.writeFileSync(path.join(cwd, 'empty.config.mjs'),
                'export default { outputDir: "./coverage-reports", reports: ["v8-json"], entryFilter: () => false };');
            const cli = fileURLToPath(new URL('../../lib/cli.js', import.meta.url));
            const empty = run([cli, '-c', 'empty.config.mjs', '--', process.execPath, '-e', 'console.log(42)']);
            assert.equal(empty.status, 0, empty.stdout + empty.stderr);
            const missing = run(['verify-coverage.mjs']);
            assert.notEqual(missing.status, 0);
            assert.match(missing.stderr, /ENOENT/);

            fs.mkdirSync(outputDir, {
                recursive: true
            });
            fs.writeFileSync(artifact, JSON.stringify({
                files: [],
                summary: {
                    lines: {
                        total: 0, pct: ''
                    }
                }
            }));
            const emptyResult = run(['verify-coverage.mjs']);
            assert.notEqual(emptyResult.status, 0);
            assert.match(emptyResult.stderr, /Missing or empty coverage from this run/);
        } finally {
            fs.rmSync(cwd, {
                recursive: true, force: true
            });
        }
    });

    it('contains syntactically valid JavaScript examples', () => {
        let count = 0;
        for (const file of files) {
            const source = fs.readFileSync(path.join(root, file), 'utf8');
            for (const match of source.matchAll(/```js\r?\n([\s\S]*?)\r?\n```/g)) {
                assert.doesNotThrow(() => parse(match[1], {
                    ecmaVersion: 'latest', sourceType: 'module'
                }), `${file}: invalid JavaScript example`);
                count += 1;
            }
        }
        assert.ok(count > 0);
    });
});
