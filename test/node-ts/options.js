import assert from 'node:assert/strict';
import path from 'node:path';
import checkSnapshot from '../check-snapshot.js';

// Shared by the two native-TS integration entry points. No transpiler or loader.
/**
 * @param {'node-ts' | 'mcr-test-ts'} id Report directory name.
 * @returns {import('../../lib/index.js').McrCliOptions} Coverage options.
 */
export const createNativeTypeScriptOptions = (id) => ({
    name: `Native TypeScript: ${id}`,
    outputDir: `.temp/site/reports/${id}`,
    assetsPath: '../assets',
    reports: ['v8', 'v8-json', 'console-summary', 'lcovonly', 'raw'],
    entryFilter: (entry) => entry.url.includes('/test/node-ts/src/'),
    all: {
        dir: 'test/node-ts/src',
        filter: (filePath) => (/\.[cm]?ts$/).test(filePath)
    },
    onEnd: (results) => {
        assert.ok(results, 'a native TypeScript report was generated');
        const files = new Map(results.files.map((file) => [path.basename(file.sourcePath), file]));
        assert.deepEqual([... files.keys()].sort(), ['common.cts', 'module.mts', 'subject.ts', 'types.ts', 'untested.ts']);
        const subject = files.get('subject.ts');
        assert.ok(subject.source.includes('interface Result'), 'report preserves TypeScript source');
        assert.equal(subject.summary.functions.total, 4);
        assert.equal(subject.summary.functions.covered, 3);
        assert.equal(subject.summary.branches.total, 2);
        assert.equal(subject.summary.branches.covered, 1);
        assert.equal(subject.data.functions.find((fn) => fn.name === 'unused').count, 0);
        assert.equal(subject.data.lines['11'], 1);
        assert.equal(subject.data.lines['13'], 0);
        assert.equal(subject.data.lines['18'], 0);
        for (const line of ['1', '3', '4', '5', '7']) {
            assert.equal(Object.hasOwn(subject.data.lines, line), false, `type-only line ${line} is not executable`);
        }
        const untested = files.get('untested.ts');
        assert.equal(untested.summary.functions.total, 1);
        assert.equal(untested.summary.branches.total, 2);
        for (const metric of ['functions', 'branches', 'statements', 'lines', 'bytes']) {
            assert.equal(untested.summary[metric].covered, 0, `untested ${metric}`);
        }
        for (const metric of ['functions', 'branches', 'statements', 'lines']) {
            assert.equal(files.get('types.ts').summary[metric].total, 0, `type-only ${metric}`);
        }
        for (const name of ['common.cts', 'module.mts']) {
            assert.equal(files.get(name).summary.functions.total, 1);
            assert.equal(files.get(name).summary.functions.covered, 1);
            assert.equal(files.get(name).summary.branches.total, 2);
            assert.equal(files.get(name).summary.branches.covered, 1);
        }
        checkSnapshot(results);
    }
});
