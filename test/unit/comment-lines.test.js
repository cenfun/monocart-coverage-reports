import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
    MCR, diffSnapshot, getSnapshot
} from '../../lib/index.js';
import { createTempRoot } from './unit-utils.js';

it('excludes JS lines containing only block comments and whitespace from V8 line coverage', async (t) => {
    const outputDir = createTempRoot('mcr-comment-lines-');
    t.after(() => fs.rm(outputDir, {
        recursive: true, force: true
    }));

    const source = [
        '/* note */  ',
        '/* one */ /* two */',
        '/* one *//* two */',
        '/* one */ const value = 1; /* two */'
    ].join('\n');
    const report = MCR({
        logging: 'off', outputDir, reports: ['v8-json']
    });
    await report.add([{
        url: 'file:///comment-lines.js',
        source,
        functions: [{
            functionName: '',
            isBlockCoverage: true,
            ranges: [{
                startOffset: 0, endOffset: source.length, count: 1
            }]
        }]
    }]);

    const result = await report.generate();
    assert.equal(result.files.length, 1);
    const [file] = result.files;
    assert.deepEqual(file.data.extras, {
        1: 'c', 2: 'c', 3: 'c'
    });
    assert.deepEqual(file.data.lines, {
        4: 1
    });
    assert.equal(file.summary.lines.comment, 3);
    assert.equal(file.summary.lines.total, 1);

    const current = getSnapshot(result);
    const previous = structuredClone(current);
    previous.files[file.sourcePath].extras = '1i,2c,3c';
    assert.equal(diffSnapshot(current, current).change, false);

    const diff = diffSnapshot(previous, current);
    assert.equal(diff.change, true);
    assert.match(diff.message, /Extras/);
    assert.match(diff.message, /1i/);
    assert.match(diff.message, /1c/);
});
