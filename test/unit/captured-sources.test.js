import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { MCR } from '../../lib/index.js';

const writeInputs = (root, captures, snapshots) => {
    const dir = path.join(root, 'coverage');
    fs.mkdirSync(dir);
    const url = pathToFileURL(path.join(root, 'subject.ts')).href;
    captures.forEach(([name, data]) => {
        fs.writeFileSync(path.join(dir, name), JSON.stringify({
            url, ... data
        }));
    });
    // The timestamp in coverage-<pid>-<timestamp>-<threadId>.json is the snapshot write time (Unix epoch milliseconds).
    snapshots.forEach(([name, source, count = 1, entryUrl = url]) => {
        fs.writeFileSync(path.join(dir, name), JSON.stringify({
            result: [{
                scriptId: '1',
                url: entryUrl,
                functions: [{
                    functionName: '',
                    isBlockCoverage: true,
                    ranges: [{
                        startOffset: 0, endOffset: source.length, count
                    }]
                }]
            }]
        }));
    });
    return dir;
};

const assertSingleCapturedSource = async (root, reporter) => {
    const source = 'export const value: number = 42;\n';
    const dir = writeInputs(root, [['source-a.json', {
        source,
        nativeTypeScript: true,
        execution: {
            // Process start time (Unix epoch milliseconds).
            processId: 123, threadId: 0, timestamp: 1000
        }
    }]], [['renamed-coverage.json', source]]);
    const coverage = reporter();
    await coverage.addFromDir(dir);
    const result = await coverage.generate();
    assert.ok(result);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].source, source);
    assert.equal(result.files[0].nativeTypeScript, true);
};

const assertCaptureFallback = async (root, reporter, t, execution, logging = 'info', nativePath = false) => {
    const source = 'export const value = 42;\n';
    const url = nativePath ? path.join(root, 'subject.ts') : pathToFileURL(path.join(root, 'subject.ts')).href;
    const dir = writeInputs(root, [
        ['source-a.json', {
            source, execution
        }],
        ['source-b.json', {
            source: source.replace('42', '43'),
            execution,
            ... nativePath && {
                nativeTypeScript: true
            }
        }]
    ], [
        ['coverage-123-1100-0.json', source, 1, url],
        ['coverage-123-1200-0.json', source, 2, url],
        ['coverage-999-1100-0.json', source, 3, url],
        ['coverage-123-1100-999.json', source, 4, url],
        ['coverage-123-900-0.json', source, 5, url]
    ]);
    const log = t.mock.method(console, 'log', () => {});
    const entries = [];
    const coverage = reporter({
        logging,
        onEntry: (entry) => entries.push({
            source: entry.source, count: entry.functions[0].ranges[0].count
        })
    });
    await coverage.addFromDir(dir);
    const result = await coverage.generate();
    assert.ok(result);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].source, source);
    assert.ok(fs.existsSync(path.join(root, 'report/coverage-report.json')));
    assert.deepEqual(entries.toSorted((a, b) => a.count - b.count), [1, 2, 3, 4, 5].map((count) => ({
        source, count
    })));
    const warnings = log.mock.calls.map((call) => String(call.arguments[0])).filter((line) => (/warning|cannot associate captured source/i).test(line));
    assert.equal(warnings.length, 0);
};

// All capture execution.timestamp values below are process start times (Unix epoch milliseconds).
describe('captured source execution identity', {
    timeout: 60000
}, () => {
    let root;
    const reporter = (options = {}) => MCR({
        logging: 'off',
        baseDir: root,
        outputDir: path.join(root, 'report'),
        reports: ['v8-json'],
        entryFilter: (entry) => entry.url.includes('/subject.'),
        ... options
    });
    const run = (filename, dir) => {
        const env = {
            ... process.env, NODE_V8_COVERAGE: dir
        };
        delete env.NODE_TEST_CONTEXT;
        const child = spawnSync(process.execPath, [
            '--import', import.meta.resolve('monocart-coverage-reports/register'), filename
        ], {
            cwd: root, env, encoding: 'utf8', timeout: 15000
        });
        assert.ifError(child.error);
        assert.equal(child.status, 0, child.stdout + child.stderr);
    };
    const collect = (filename, source, name = 'coverage') => {
        fs.writeFileSync(filename, source);
        const dir = path.join(root, name);
        run(filename, dir);
        return dir;
    };
    const assertVersions = (result, first, second) => {
        assert.ok(result);
        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [first, second].sort());
        for (const file of result.files) {
            const expected = file.source === first ? 1 : 2;
            assert.equal(file.data.functions.find((fn) => fn.name === 'choose').count, expected);
            assert.equal(file.summary.branches.covered, 1);
        }
    };

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr captured sources '));
        fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    ['mjs', 'ts', 'cts'].forEach((extension) => {
        const type = extension === 'mjs' ? '' : ': number';
        const prefix = `function choose(value${type}) { return value ? 1 : 0; }\n`;
        const suffix = '\n//# sourceMappingURL=subject.js.map\n';
        const first = `${prefix}${'choose(1);'.padEnd('choose(0);choose(0);'.length)}${suffix}`;
        const second = `${prefix}choose(0);choose(0);${suffix}`;

        it(`associates different .${extension} executions sharing a URL and capture directory`, async () => {
            const filename = path.join(root, `subject.${extension}`);
            const dir = collect(filename, first);
            collect(filename, second);
            assert.equal(first.length, second.length, 'range lengths cannot identify the correct source');
            const inputs = fs.readdirSync(dir);
            fs.unlinkSync(filename);
            const coverage = reporter();
            await coverage.addFromDir(dir);
            assertVersions(await coverage.generate(), first, second);
            assert.deepEqual(fs.readdirSync(dir), inputs, 'keep collection inputs unchanged');
        });

        it(`merges repeated .${extension} executions with identical captured sources`, async () => {
            const filename = path.join(root, `subject.${extension}`);
            const dir = collect(filename, first);
            collect(filename, first);
            fs.unlinkSync(filename);
            const coverage = reporter();
            await coverage.addFromDir(dir);
            const result = await coverage.generate();
            assert.ok(result);
            assert.equal(result.files.length, 1);
            assert.equal(result.files[0].source, first);
            assert.equal(result.files[0].data.functions.find((fn) => fn.name === 'choose').count, 2);
        });

        it(`keeps .${extension} source versions distinct when captures use separate directories`, async () => {
            const filename = path.join(root, `subject.${extension}`);
            const firstDir = collect(filename, first, 'first');
            const secondDir = collect(filename, second, 'second');
            fs.unlinkSync(filename);
            const coverage = reporter();
            await coverage.addFromDir(firstDir);
            await coverage.addFromDir(secondDir);
            assertVersions(await coverage.generate(), first, second);
        });
    });

    it('isolates workers sharing a process and URL', async () => {
        const first = 'function choose(value: number) { return value ? 1 : 0; }\nchoose(1);\n';
        const second = first.replace('choose(1);', 'choose(0);choose(0);');
        const entry = path.join(root, 'workers.mjs');
        fs.writeFileSync(entry, `
            import fs from 'node:fs';
            import { Worker } from 'node:worker_threads';
            const subject = new URL('./subject.ts', import.meta.url);
            for (const source of ${JSON.stringify([first, second])}) {
                fs.writeFileSync(subject, source);
                await new Promise((resolve, reject) => {
                    const worker = new Worker(subject);
                    worker.on('error', reject);
                    worker.on('exit', (code) => code ? reject(new Error('worker failed')) : resolve());
                });
            }
        `);
        const dir = path.join(root, 'coverage');
        run(entry, dir);
        const captures = fs.readdirSync(dir).filter((name) => name.startsWith('source-'));
        assert.equal(captures.length, 2);
        const executions = captures.map((name) => {
            assert.match(name, /^source-[a-f0-9]{40}\.json$/);
            return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')).execution;
        });
        assert.equal(new Set(executions.map((item) => item.processId)).size, 1, 'same PID');
        assert.equal(new Set(executions.map((item) => item.threadId)).size, 2, 'distinct thread IDs');
        fs.unlinkSync(path.join(root, 'subject.ts'));
        const coverage = reporter();
        await coverage.addFromDir(dir);
        assertVersions(await coverage.generate(), first, second);
    });

    it('uses the same capture for multiple v8.takeCoverage() snapshots', async () => {
        const source = `import { takeCoverage } from 'node:v8';
function choose(value: number) { return value ? 1 : 0; }
choose(1);
takeCoverage();
choose(0);
`;
        const dir = collect(path.join(root, 'subject.ts'), source);
        assert.ok(fs.readdirSync(dir).filter((name) => name.startsWith('coverage-')).length >= 2);
        const coverage = reporter();
        await coverage.addFromDir(dir);
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].source, source);
        assert.equal(result.files[0].data.functions.find((fn) => fn.name === 'choose').count, 2);
        assert.equal(result.files[0].summary.branches.covered, 2);
    });


    [false, true].forEach((newestFirst) => {
        it(`distinguishes reused PIDs with newest-first=${newestFirst}`, async () => {
            const first = 'export const value = 41;\n';
            const second = 'export const value = 42;\n';
            const dir = writeInputs(root, [
                [newestFirst ? 'source-b.json' : 'source-a.json', {
                    execution: {
                        processId: 123, threadId: 0, timestamp: 1000
                    },
                    source: first
                }],
                [newestFirst ? 'source-a.json' : 'source-b.json', {
                    execution: {
                        processId: 123, threadId: 0, timestamp: 2000
                    },
                    source: second
                }]
            ], [
                ['coverage-123-1100-0.json', first],
                ['coverage-123-2100-0.json', second]
            ]);
            const coverage = reporter();
            await coverage.addFromDir(dir);
            const result = await coverage.generate();
            assert.ok(result);
            assert.deepEqual(result.files.map((file) => file.source).sort(), [first, second].sort());
        });
    });

    it('preserves different native TS load identities in separate executions', async () => {
        const source = 'export const value = 42;\n';
        const dir = writeInputs(root, [
            ['source-a.json', {
                execution: {
                    processId: 123, threadId: 0, timestamp: 1000
                },
                source,
                nativeTypeScript: true
            }],
            ['source-b.json', {
                execution: {
                    processId: 124, threadId: 0, timestamp: 1000
                },
                source
            }]
        ], [
            ['coverage-123-1100-0.json', source],
            ['coverage-124-1100-0.json', source]
        ]);
        const identities = [];
        const coverage = reporter({
            onEntry: (entry) => identities.push(Boolean(entry.nativeTypeScript))
        });
        await coverage.addFromDir(dir);
        assert.deepEqual(identities.sort(), [false, true]);
        assert.ok(await coverage.generate());
    });

    it('reads legacy captures without execution metadata, including identical duplicates', async () => {
        const source = 'export const value = 42;\n';
        const dir = writeInputs(root, [
            ['source-a.json', {
                source
            }],
            ['source-b.json', {
                source, nativeTypeScript: false
            }]
        ], [['renamed-coverage.json', source]]);
        const coverage = reporter();
        await coverage.addFromDir(dir);
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].source, source);
    });

    it('uses a single captured source directly without requiring execution matching', async () => {
        await assertSingleCapturedSource(root, reporter);
    });

    it('deterministically selects conflicting legacy captures without warnings', async (t) => {
        await assertCaptureFallback(root, reporter, t);
    });

    it('always selects a source for matching or unmatched executions without warnings', async (t) => {
        await assertCaptureFallback(root, reporter, t, {
            processId: 123, threadId: 0, timestamp: 1000
        });
    });

    it('honors logging off while still generating a best-effort report', async (t) => {
        await assertCaptureFallback(root, reporter, t, null, 'off');
    });

    it('retains native-path coverage despite conflicting capture identities', async (t) => {
        await assertCaptureFallback(root, reporter, t, null, 'info', true);
    });

    it('does not reject legacy conflicts for entries excluded by entryFilter', async () => {
        const source = 'export const value = 42;\n';
        const dir = writeInputs(root, [
            ['source-a.json', {
                source
            }],
            ['source-b.json', {
                source: source.replace('42', '43')
            }]
        ], [['coverage-123-1100-0.json', source]]);
        const coverage = reporter({
            entryFilter: () => false
        });
        await coverage.addFromDir(dir);
        assert.equal(coverage.hasCache(), false);
    });

    it('does not replace execution-scoped sources with conflicting legacy captures', async () => {
        const source = 'export const value = 42;\n';
        const dir = writeInputs(root, [
            ['source-a.json', {
                source: 'old build A'
            }],
            ['source-b.json', {
                source: 'old build B'
            }],
            ['source-c.json', {
                execution: {
                    processId: 123, threadId: 0, timestamp: 1000
                },
                source
            }]
        ], [['coverage-123-1100-0.json', source]]);
        const coverage = reporter();
        await coverage.addFromDir(dir);
        const result = await coverage.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].source, source);
    });

    it('also associates executions when generate() loads dataDir automatically', async () => {
        const filename = path.join(root, 'subject.ts');
        const first = 'export const value: number = 41;\n';
        const second = 'export const value: number = 42;\n';
        const dir = collect(filename, first);
        collect(filename, second);
        fs.unlinkSync(filename);
        const result = await reporter({
            dataDir: dir
        }).generate();
        assert.ok(result);
        assert.deepEqual(result.files.map((file) => file.source).sort(), [first, second].sort());
    });
});
