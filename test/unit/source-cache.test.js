import {
    describe, it, beforeEach, afterEach, mock
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSourceReader } from '../../lib/register/source-cache.js';
import { calculateSha1 } from '../../lib/utils/source-id.js';
import { MCR } from '../../lib/index.js';
import { Util } from '../../lib/utils/util.js';
import { createTempRoot } from './unit-utils.js';

const url = 'file:///subject.ts';

describe('captured source resolution', () => {
    let root;
    beforeEach(() => {
        root = createTempRoot('mcr-source-cache-');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const capture = (pid, thread, source, nativeTypeScript = true, sourceURL = url) => {
        const filename = `source-${pid}-${thread}-${calculateSha1(sourceURL)}-${calculateSha1(source)}${nativeTypeScript ? '-ts' : ''}.json`;
        fs.writeFileSync(path.join(root, filename), JSON.stringify({
            url: sourceURL, source, nativeTypeScript
        }));
        return filename;
    };
    const reader = () => createSourceReader(root, fs.readdirSync(root));

    [false, true].forEach((legacy) => {
        it(`reads each captured source only once across repeated coverage snapshots (legacy=${legacy})`, async () => {
            let filename;
            if (legacy) {
                filename = 'source-legacy.json';
                fs.writeFileSync(path.join(root, filename), JSON.stringify({
                    url, source: 'var value = 1;'
                }));
            } else {
                filename = capture(100, 0, 'var value = 1;', false);
            }
            const readFile = Util.readFile;
            let reads = 0;
            const mocked = mock.method(Util, 'readFile', (file, ... args) => {
                if (file === path.join(root, filename)) {
                    reads += 1;
                }
                return readFile(file, ... args);
            });
            try {
                const read = reader();
                for (let i = 0; i < 5; i++) {
                    assert.equal((await read(url, `coverage-100-${12345 + i}-0.json`)).source, 'var value = 1;');
                }
                assert.equal(reads, 1);
            } finally {
                mocked.mock.restore();
            }
        });
    });

    it('matches process, worker thread and URL before choosing a source version', async () => {
        capture(100, 0, 'const value: number = 1;');
        capture(200, 0, 'const value: number = 2;');
        capture(100, 1, 'const value: number = 3;');
        const read = reader();
        assert.equal((await read(url, 'coverage-100-12345-0.json')).source, 'const value: number = 1;');
        assert.equal((await read(url, 'coverage-200-12345-0.json')).source, 'const value: number = 2;');
        assert.equal((await read(url, 'coverage-100-12345-1.json')).source, 'const value: number = 3;');
        assert.equal(typeof await read(url, 'coverage-300-12345-0.json'), 'undefined');
        assert.equal(typeof await read('file:///other.ts', 'coverage-100-12345-0.json'), 'undefined');
    });

    it('rejects ambiguous versions within the same process and thread', async () => {
        capture(100, 0, 'const value = 1;');
        capture(100, 0, 'const value = 2;');
        await assert.rejects(reader()(url, 'coverage-100-12345-0.json'), /Ambiguous captured source versions/);
    });

    it('keeps native loading facts for identical captured text', async () => {
        capture(100, 0, 'const value = 1;', false);
        capture(100, 0, 'const value = 1;', true);
        assert.equal((await reader()(url, 'coverage-100-12345-0.json')).nativeTypeScript, true);
    });

    it('supports a unique legacy capture but rejects conflicting legacy versions', async () => {
        fs.writeFileSync(path.join(root, 'source-legacy-one.json'), JSON.stringify({
            url, source: 'const value = 1;'
        }));
        assert.equal((await reader()(url, 'coverage-100-12345-0.json')).source, 'const value = 1;');
        fs.writeFileSync(path.join(root, 'source-legacy-two.json'), JSON.stringify({
            url, source: 'const value = 2;'
        }));
        await assert.rejects(reader()(url, 'coverage-100-12345-0.json'), /Ambiguous captured source versions/);
    });

    it('rejects invalid selected source data instead of falling back to newer disk source', async () => {
        const filename = capture(100, 0, 'const value = 1;');
        fs.writeFileSync(path.join(root, filename), JSON.stringify({
            url, source: null
        }));
        await assert.rejects(reader()(url, 'coverage-100-12345-0.json'), /Invalid captured source/);
    });

    it('does not read captures excluded by the entry filter or belonging to other processes', async () => {
        const keepURL = pathToFileURL(path.join(root, 'keep.ts')).href;
        const skipURL = pathToFileURL(path.join(root, 'skip.ts')).href;
        const source = 'export const value: number = 1;\n';
        capture(100, 0, source, true, keepURL);
        const skip = capture(100, 0, source, true, skipURL);
        const other = capture(200, 0, source, true, keepURL);
        fs.writeFileSync(path.join(root, skip), 'invalid JSON must not be read');
        fs.writeFileSync(path.join(root, other), 'invalid JSON must not be read');
        fs.writeFileSync(path.join(root, 'coverage-100-12345-0.json'), JSON.stringify({
            result: [keepURL, skipURL].map((entryURL) => ({
                url: entryURL,
                functions: [{
                    functionName: '',
                    isBlockCoverage: true,
                    ranges: [{
                        startOffset: 0, endOffset: source.length, count: 1
                    }]
                }]
            }))
        }));
        const report = MCR({
            logging: 'off', reports: ['v8-json'], outputDir: path.join(root, 'report'), entryFilter: (item) => item.url === keepURL
        });
        await report.addFromDir(root);
        const result = await report.generate();
        assert.ok(result);
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].source, source);
        assert.equal(result.files[0].nativeTypeScript, true);
    });
});
