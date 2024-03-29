const assert = require('assert');
const { dedupeFlatRanges } = require('../../lib/utils/dedupe.js');

it('dedupeFlatRanges', () => {

    const ranges = [{
        start: 0, end: 10
    }, {
        start: 100, end: 200
    }, {
        start: 0, end: 15
    }, {
        start: 20, end: 30
    }, {
        start: 18, end: 25
    }, {
        start: 50, end: 60
    }, {
        start: 55, end: 58
    }, {
        start: 58, end: 66
    }, {
        start: 50, end: 80
    }, {
        start: 30, end: 50
    }];
    const newRanges = dedupeFlatRanges(ranges);
    // console.log('dedupeFlatRanges', newRanges);

    assert.equal(JSON.stringify(newRanges), '[{"start":0,"end":15},{"start":18,"end":80},{"start":100,"end":200}]');

});
