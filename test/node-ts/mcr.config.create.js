import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import checkSnapshot from '../check-snapshot.js';

// Native execution uses synthetic source maps and does not opt into "all".
/**
 * @param {'node-ts' | 'mcr-test-ts'} id Report directory name.
 * @returns {import('../../lib/index.js').McrCliOptions} Coverage options.
 */
export const createNativeTypeScriptOptions = (id) => ({
    name: `Native TypeScript: ${id}`,
    outputDir: `.temp/site/reports/${id}`,
    assetsPath: '../assets',
    reports: ['v8', 'v8-json', 'console-summary', 'raw'],
    entryFilter: (entry) => entry.url.includes('/test/node-ts/src/'),
    onEnd: (results) => {
        assert.ok(results, 'a native TypeScript report was generated');
        assert.ok(fs.existsSync(`.temp/site/reports/${id}/index.html`));
        assert.ok(fs.existsSync(`.temp/site/reports/${id}/coverage-report.json`));
        const files = new Map(results.files.map((file) => [path.basename(file.sourcePath), file]));
        assert.deepEqual([... files.keys()].sort(), ['common.cts', 'module.mts', 'subject.ts', 'types.ts', 'typescript.ts']);
        for (const file of files.values()) {
            assert.equal(file.nativeTypeScript, true);
            assert.equal(Object.hasOwn(file, 'hasBOM'), false);
            assert.equal(file.source, fs.readFileSync(file.sourcePath, 'utf8'));
        }
        const subject = files.get('subject.ts');
        assert.ok(subject.source.includes('function describe'));
        assert.ok(subject.source.includes('interface Result'), 'the report displays original TS');
        assert.equal(subject.summary.functions.total, 4);
        assert.equal(subject.summary.functions.covered, 3);
        assert.equal(subject.data.functions.find((fn) => fn.name === 'unused').count, 0);
        for (const name of ['common.cts', 'module.mts']) {
            assert.equal(files.get(name).summary.functions.total, 1);
            assert.equal(files.get(name).summary.branches.covered, 1);
        }
        assert.equal(files.get('types.ts').summary.functions.total, 0);
        const typescript = files.get('typescript.ts');
        assert.equal(typescript.summary.functions.total, 2);
        assert.equal(typescript.summary.functions.covered, 2);
        assert.equal(typescript.summary.statements.uncovered, 0);
        assert.equal(typescript.data.functions.length, 2);
        for (const fn of typescript.data.functions) {
            assert.equal(fn.count, 1);
            assert.ok(typescript.source.slice(fn.start, fn.end).includes('=>'));
        }
        assert.ok(typescript.source.includes('type Point ='));
        assert.ok(typescript.source.includes(': Point'));
        assert.ok(typescript.source.includes(': string'));
        assert.ok(typescript.source.includes('typescript block comment'));
        assert.ok(typescript.source.includes('typescript line comment'));
        checkSnapshot(results);
    }
});
