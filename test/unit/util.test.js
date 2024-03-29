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
