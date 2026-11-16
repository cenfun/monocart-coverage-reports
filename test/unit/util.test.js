import { it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { Util } from '../../lib/utils/util.js';

it('Util.cmpVersion', () => {
    assert.ok(Util.cmpVersion('14.0.0', '18') < 0);
    assert.ok(Util.cmpVersion('20.0.0', '18') > 0);

    assert.ok(Util.cmpVersion('20.10', '20.11.1') < 0);
    assert.ok(Util.cmpVersion('20.11', '20.11.1') < 0);

    assert.ok(Util.cmpVersion('18.0.0', '18') === 0);
    assert.ok(Util.cmpVersion('18.1.0', '18') > 0);
    assert.ok(Util.cmpVersion('18.0.1', '18') > 0);

    assert.ok(Util.cmpVersion('18.0.0-beta-1', '18') === 0);
    assert.ok(Util.cmpVersion('18.0.1-beta-1', '18') > 0);


});


it('Util.findUpConfig resolves explicit paths and prefers the nearest default config', (t) => {
    const tempDir = path.resolve(import.meta.dirname, '../../.temp');
    fs.mkdirSync(tempDir, {
        recursive: true
    });
    const root = fs.mkdtempSync(path.join(tempDir, 'find-config-'));
    const cwd = process.cwd();
    t.after(() => {
        process.chdir(cwd);
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    const child = path.join(root, 'child');
    const parentConfig = path.join(root, 'mcr.config.cjs');
    const childConfig = path.join(child, 'mcr.config.mjs');
    fs.mkdirSync(child);
    fs.writeFileSync(parentConfig, '');
    process.chdir(child);

    assert.equal(typeof Util.findUpConfig('missing.cjs'), 'undefined');
    assert.equal(Util.findUpConfig(parentConfig), parentConfig);
    assert.equal(Util.findUpConfig(), parentConfig);
    fs.writeFileSync(childConfig, '');
    assert.equal(Util.findUpConfig(), childConfig);
});
