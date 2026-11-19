import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Session } from 'node:inspector';
import { MCR } from '../../lib/index.js';
import { createTempRoot } from './unit-utils.js';

const source = 'function pick(x) { if (x) return 1; return 0; }\npick(1);\n';
const capture = async (url, detailed) => {
    const session = new Session();
    session.connect();
    const post = (method, params = {}) => new Promise((resolve, reject) => {
        session.post(method, params, (error, value) => (error ? reject(error) : resolve(value)));
    });
    try {
        await post('Profiler.enable');
        await post('Profiler.startPreciseCoverage', {
            callCount: true, detailed
        });
        new vm.Script(source, {
            filename: url
        }).runInNewContext();
        const { result } = await post('Profiler.takePreciseCoverage');
        const item = result.find((entry) => entry.url === url);
        assert.ok(item);
        return {
            ... item, source
        };
    } finally {
        session.disconnect();
    }
};

describe('legacy V8 compatibility', () => {
    let root;
    beforeEach(() => {
        root = createTempRoot('mcr-legacy-v8-');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    ['js', 'ts'].forEach((extension) => {
        [false, true].forEach((compact) => {
            it(`keeps precise uncovered statements for non-native .${extension} coverage (raw.merge=${compact})`, async () => {
                const entries = [
                    await capture(`file:///server-${compact}.${extension}`, true),
                    await capture(`file:///browser-${compact}.${extension}`, false)
                ];
                const outputDir = path.join(root, 'original');
                const report = MCR({
                    logging: 'off',
                    reports: ['v8-json', ['raw', {
                        merge: compact
                    }]],
                    outputDir,
                    sourcePath: () => 'shared.js'
                });
                await report.add(entries);
                const result = await report.generate();
                assert.ok(result);
                assert.equal(result.files.length, 1);
                const file = result.files[0];
                const uncovered = file.data.statements.find((item) => item.start === source.indexOf('return 0;'));
                assert.ok(uncovered);
                assert.equal(uncovered.count, 0, 'function-only coverage is not evidence that every statement ran');
                assert.equal(file.summary.statements.pct, 80);
                const merged = await MCR({
                    logging: 'off', reports: ['v8-json'], inputDir: path.join(outputDir, 'raw'), outputDir: path.join(root, 'merged')
                }).generate();
                assert.ok(merged);
                assert.deepEqual(merged.files[0].data, file.data);
                assert.deepEqual(merged.summary, result.summary);
            });
        });
    });

    it('does not replay a non-idempotent sourcePath callback on saved raw paths', async () => {
        const text = 'var value = 1;\n';
        const create = () => ({
            url: 'file:///subject.js',
            source: text,
            functions: [{
                functionName: '',
                isBlockCoverage: true,
                ranges: [{
                    startOffset: 0, endOffset: text.length, count: 1
                }]
            }]
        });
        let calls = 0;
        const sourcePath = (name) => {
            calls += 1;
            return `prefixed/${name}`;
        };
        const outputDir = path.join(root, 'original');
        const original = MCR({
            logging: 'off', reports: ['v8-json', 'raw'], outputDir, sourcePath
        });
        const added = await original.add([create()]);
        assert.ok(await original.generate());
        const combined = MCR({
            logging: 'off', reports: ['v8-json'], inputDir: path.join(outputDir, 'raw'), outputDir: path.join(root, 'combined'), sourcePath
        });
        await combined.add([create()]);
        const result = await combined.generate();
        assert.ok(result);
        assert.equal(calls, 2, 'only freshly added entries run the path callback');
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].id, added.data[0].id);
        assert.equal(result.files[0].sourcePath, added.data[0].sourcePath);
        assert.equal(result.files[0].data.statements[0].count, 2);
    });
});
