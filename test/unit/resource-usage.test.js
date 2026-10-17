import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Util } from '../../lib/utils/util.js';
import { getUntestedList } from '../../lib/converter/untested.js';
import { getJsAstInfo } from '../../lib/converter/ast.js';

const run = (code, args = []) => {
    const result = spawnSync(process.execPath, [... args, '--input-type=module', '-e', code], {
        encoding: 'utf8', timeout: 15000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
};

describe('lazy GC and memory sampling', () => {
    const entry = import.meta.resolve('../../lib/index.js');
    const gcModule = import.meta.resolve('../../lib/utils/gc.js');

    it('does not initialize GC or change host globals when importing the API', () => {
        run(`
            import assert from 'node:assert/strict';
            import v8 from 'node:v8';
            import vm from 'node:vm';
            const original = globalThis.gc;
            v8.setFlagsFromString = () => { throw new Error('Eager V8 flags'); };
            const runContext = vm.runInNewContext;
            vm.runInNewContext = (code, ...args) => {
                if (code === 'gc') throw new Error('Eager GC context');
                return runContext(code, ...args);
            };
            await import(${JSON.stringify(entry)});
            assert.equal(globalThis.gc, original);
        `);
    });

    it('initializes only on use, restores the expose flag and does not install global.gc', () => {
        run(`
            import assert from 'node:assert/strict';
            import v8 from 'node:v8';
            const original = globalThis.gc;
            const flags = [];
            const setFlags = v8.setFlagsFromString;
            v8.setFlagsFromString = (flag) => { flags.push(flag); setFlags(flag); };
            const { gc } = await import(${JSON.stringify(gcModule)});
            assert.equal(flags.length, 0);
            gc(); gc();
            assert.deepEqual(flags, ['--expose_gc', '--no-expose_gc']);
            assert.equal(globalThis.gc, original);
        `, ['--no-expose-gc']);
    });

    it('preserves an already-enabled expose flag even if the host replaced global.gc', () => {
        run(`
            import assert from 'node:assert/strict';
            import v8 from 'node:v8';
            import vm from 'node:vm';
            globalThis.gc = null;
            v8.setFlagsFromString = () => { throw new Error('Must preserve host flags'); };
            const { gc } = await import(${JSON.stringify(gcModule)});
            gc();
            assert.equal(globalThis.gc, null);
            assert.equal(vm.runInNewContext('typeof gc'), 'function');
        `, ['--expose-gc']);
    });

    it('uses a GC function provided by the host without altering it', () => {
        run(`
            import assert from 'node:assert/strict';
            let calls = 0;
            const hostGC = () => { calls++; };
            globalThis.gc = hostGC;
            const { gc } = await import(${JSON.stringify(gcModule)});
            gc(); gc();
            assert.equal(calls, 2);
            assert.equal(globalThis.gc, hostGC);
        `);
    });

    it('skips memory reads unless logging or GC needs them, and resamples only after GC', () => {
        const original = {
            getMemory: Util.getMemory,
            forceGC: Util.forceGC,
            level: Util.loggingLevel,
            threshold: Util.gcThreshold,
            log: console.log,
            env: process.env.MCR_LOG_TIME
        };
        let reads = 0;
        let collections = 0;
        try {
            delete process.env.MCR_LOG_TIME;
            console.log = () => {};
            Util.getMemory = () => {
                reads++; return 100;
            };
            Util.forceGC = () => {
                collections++;
            };
            Util.loggingLevel = Util.loggingLevels.off;
            Util.gcThreshold = 0;
            Util.logTime('off', Date.now());
            assert.equal(reads, 0);
            Util.loggingLevel = Util.loggingLevels.debug;
            Util.logTime('debug', Date.now());
            assert.equal(reads, 1);
            Util.loggingLevel = Util.loggingLevels.off;
            Util.gcThreshold = 200;
            Util.logTime('below threshold', Date.now());
            assert.equal(reads, 2);
            assert.equal(collections, 0);
            Util.gcThreshold = 50;
            Util.logTime('above threshold', Date.now());
            assert.equal(reads, 4);
            assert.equal(collections, 1);
            Util.gcThreshold = 0;
            process.env.MCR_LOG_TIME = '1';
            Util.logTime('environment enabled', Date.now());
            assert.equal(reads, 5);
        } finally {
            Util.getMemory = original.getMemory;
            Util.forceGC = original.forceGC;
            Util.loggingLevel = original.level;
            Util.gcThreshold = original.threshold;
            console.log = original.log;
            if (typeof original.env === 'string') {
                process.env.MCR_LOG_TIME = original.env;
            } else {
                delete process.env.MCR_LOG_TIME;
            }
        }
    });
});

describe('untested file reads', () => {
    let root;
    let originalRead;
    let reads;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-read-filter-'));
        const src = path.join(root, 'src');
        fs.mkdirSync(src);
        for (const name of ['keep', 'skip', 'tested']) {
            fs.writeFileSync(path.join(src, `${name}.js`), `const ${name} = 1;\n`);
        }
        originalRead = Util.readFileSync;
        reads = [];
        Util.readFileSync = (file) => {
            reads.push(path.basename(file));
            return originalRead(file);
        };
    });
    afterEach(() => {
        Util.readFileSync = originalRead;
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    const options = () => ({
        all: path.join(root, 'src'),
        baseDir: root,
        cacheDir: path.join(root, 'cache'),
        sourceFilter: '**/keep.js'
    });

    it('does not read already tested or source-filtered files', async () => {
        const list = await getUntestedList(new Map([['src/tested.js', true]]), options());
        assert.deepEqual(reads, ['keep.js']);
        assert.equal(list.length, 1);
        assert.equal(list[0].source, 'const keep = 1;\n');
    });

    it('also defers reads with object sourcePath replacements', async () => {
        const config = {
            ... options(),
            sourcePath: {
                'src/': 'renamed/'
            }
        };
        const list = await getUntestedList(new Map([['renamed/tested.js', true]]), config);
        assert.deepEqual(reads, ['keep.js']);
        assert.equal(list[0].sourcePath, 'renamed/keep.js');
    });

    it('preserves source access and mutation in sourcePath callbacks and transformers', async () => {
        const seen = [];
        const config = {
            ... options(),
            sourcePath: (file, entry) => {
                assert.equal(typeof entry.source, 'string');
                seen.push(file);
                entry.source += '// rewritten\n';
                return file;
            }
        };
        config.all = {
            dir: config.all,
            transformer: (entry) => {
                assert.ok(entry.source.endsWith('// rewritten\n'));
                entry.source += '// transformed\n';
            }
        };
        const list = await getUntestedList(new Map([['src/tested.js', true]]), config);
        assert.equal(reads.length, 3);
        assert.equal(seen.length, 3);
        assert.ok(list[0].source.endsWith('// rewritten\n// transformed\n'));
    });
});

it('uses the last enclosing covered block when AST offsets are not exact matches', () => {
    const source = '  let a = 1;\n  let b = 2;\n';
    const info = getJsAstInfo({
        source
    }, [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [
            {
                startOffset: 0, endOffset: source.length, count: 1
            },
            {
                startOffset: 0, endOffset: source.length, count: 3
            },
            {
                startOffset: 1, endOffset: source.length, count: 7
            }
        ]
    }]);
    assert.ok(info.statements.length > 0);
    assert.ok(info.statements.every((statement) => statement.count === 7));
});
