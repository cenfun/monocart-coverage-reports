import {
    before, describe, it
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { transformSync } from '@swc/core';
import { MCR } from '../../lib/index.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';
import { Util } from '../../lib/utils/util.js';
import { getV8Summary } from '../../lib/v8/v8-summary.js';

const source = 'class Example { value = 1; method() { return this.value; } } new Example().method();';
const compile = (target) => transformSync(source, {
    filename: 'shared.js',
    sourceFileName: 'shared.js',
    sourceMaps: true,
    inlineSourcesContent: true,
    isModule: false,
    jsc: {
        target,
        parser: {
            syntax: 'ecmascript'
        }
    }
});

const modern = compile('es2022');
const legacy = compile('es5');
let functions;

before(() => {
    Util.initLoggingLevel('off');
    // Isolate profiling so it cannot reset the test process's own coverage.
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import vm from 'node:vm';
        import { Session } from 'node:inspector/promises';
        const session = new Session();
        session.connect();
        try {
            await session.post('Profiler.enable');
            await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
            vm.runInNewContext(${JSON.stringify(modern.code)}, {}, { filename: 'mcr-empty-modern.js' });
            const { result } = await session.post('Profiler.takePreciseCoverage');
            const script = result.find((entry) => entry.url === 'mcr-empty-modern.js');
            if (!script) throw new Error('Missing modern build coverage');
            process.stdout.write(JSON.stringify(script.functions));
            await session.post('Profiler.stopPreciseCoverage');
        } finally {
            session.disconnect();
        }
    `], {
        encoding: 'utf8', timeout: 10000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    functions = JSON.parse(result.stdout);
});

const createReal = (name = 'real') => ({
    id: name,
    type: 'js',
    url: `http://localhost/${name}.js`,
    sourcePath: `${name}.js`,
    source: modern.code,
    sourceMap: JSON.parse(modern.map),
    functions: structuredClone(functions)
});

const createEmpty = (name = 'empty') => {
    const entry = {
        id: name,
        empty: true,
        type: 'js',
        url: `http://localhost/${name}.js`,
        sourcePath: `${name}.js`,
        source: legacy.code,
        sourceMap: JSON.parse(legacy.map)
    };
    Util.setEmptyV8Coverage(entry);
    return entry;
};

const convert = async (entries) => {
    const result = await convertV8List(entries, {
        ... defaultOptions, logging: 'off'
    });
    getV8Summary(result.v8DataList, defaultOptions.watermarks);
    return result;
};

const generate = async (entries) => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-empty-map-'));
    try {
        const report = MCR({
            logging: 'off', outputDir, reports: ['v8-json']
        });
        await report.add(entries);
        const result = await report.generate();
        assert.ok(result);
        assert.ok(fs.existsSync(path.join(outputDir, 'coverage-report.json')));
        return result;
    } finally {
        fs.rmSync(outputDir, {
            recursive: true, force: true
        });
    }
};

const assertSameCoverage = (actual, expected) => {
    assert.equal(actual.v8DataList.length, 1);
    assert.notEqual(actual.v8DataList[0].empty, true);
    assert.deepEqual(actual.v8DataList, expected.v8DataList);
    assert.deepEqual(actual.coverageData, expected.coverageData);
    assert.deepEqual(actual.fileSources, expected.fileSources);
};

describe('sourcemap empty entry merging', () => {
    for (const reverse of [false, true]) {
        it(`ignores empty ES5 metrics when real ES2022 coverage exists (reverse: ${reverse})`, async () => {
            const expected = await convert([createReal()]);
            const emptyOnly = await convert([createEmpty()]);
            // The legacy transform adds mapped helper functions, so merging its
            // zero counts would change the denominator even without execution.
            assert.ok(emptyOnly.v8DataList[0].summary.functions.total > expected.v8DataList[0].summary.functions.total);
            const entries = [createReal(), createEmpty()];
            if (reverse) {
                entries.reverse();
            }
            assertSameCoverage(await convert(entries), expected);
        });

        it(`preserves public API summaries with an empty legacy build (reverse: ${reverse})`, async () => {
            const expected = await generate([createReal()]);
            assert.equal(expected.summary.functions.pct, 100);
            assert.equal(expected.summary.statements.pct, 100);
            const entries = [createReal(), createEmpty()];
            if (reverse) {
                entries.reverse();
            }
            const actual = await generate(entries);
            assert.equal(actual.files.length, 1);
            assert.notEqual(actual.files[0].empty, true);
            assert.deepEqual(actual.summary, expected.summary);
            assert.deepEqual(actual.files[0].data, expected.files[0].data);
        });
    }

    for (const position of [0, 1, 2]) {
        it(`keeps merging real executions with an empty entry at position ${position}`, async () => {
            const expected = await convert([createReal('first'), createReal('second')]);
            const entries = [createReal('first'), createReal('second')];
            entries.splice(position, 0, createEmpty());
            assertSameCoverage(await convert(entries), expected);
        });
    }

    it('keeps an empty original when there is no real coverage', async () => {
        const result = await convert([createEmpty()]);
        assert.equal(result.v8DataList.length, 1);
        const [file] = result.v8DataList;
        assert.equal(file.sourcePath, 'shared.js');
        assert.equal(file.empty, true);
        assert.equal(file.summary.bytes.pct, 0);
        assert.equal(file.summary.functions.covered, 0);
        assert.equal(file.summary.statements.covered, 0);
    });
});
