const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Util = require('../../lib/utils/util.js');

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


it('Util.findUpConfig', () => {

    // custom
    assert.equal(typeof Util.findUpConfig('package-invalid.json'), 'undefined');
    assert.equal(Util.findUpConfig('package.json'), 'package.json');

    // default config
    const mcrPath = path.resolve('mcr.config.mjs');
    const mcrParentPath = path.resolve('../mcr.config.js');
    console.log(mcrPath);
    console.log(mcrParentPath);
    if (fs.existsSync(mcrPath)) {
        fs.rmSync(mcrPath, {
            force: true,
            maxRetries: 10
        });
    }
    if (fs.existsSync(mcrParentPath)) {
        fs.rmSync(mcrParentPath, {
            force: true,
            maxRetries: 10
        });
    }

    assert.equal(typeof Util.findUpConfig(), 'undefined');

    fs.writeFileSync(mcrPath, '');
    assert.equal(Util.findUpConfig(), mcrPath);
    fs.rmSync(mcrPath, {
        force: true,
        maxRetries: 10
    });
    assert.equal(typeof Util.findUpConfig(), 'undefined');

    // parent
    fs.writeFileSync(mcrParentPath, '');
    assert.equal(Util.findUpConfig(), mcrParentPath);
    fs.rmSync(mcrParentPath, {
        force: true,
        maxRetries: 10
    });
    assert.equal(typeof Util.findUpConfig(), 'undefined');

});

