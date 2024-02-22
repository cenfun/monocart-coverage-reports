const fs = require('fs');
const path = require('path');
const assert = require('assert');
const EC = require('eight-colors');

const getJson = (p) => {
    return JSON.parse(fs.readFileSync(p));
};

const checkNodeResults = () => {
    console.log('checking 4 node results should be same');

    // fgc can not run in GA ci
    const list = ['api', 'cdp', 'env', 'ins'];

    list.reduce((p, c) => {

        const pJson = getJson(path.resolve(`./docs/v8-node-${p}/coverage-report.json`));
        const cJson = getJson(path.resolve(`./docs/v8-node-${c}/coverage-report.json`));

        // should be same except name
        pJson.name = null;
        cJson.name = null;

        assert.deepEqual(pJson, cJson);
        console.log(`${p} ${EC.green('=')} ${c}`);

        return c;
    });

};

module.exports = async () => {
    console.log('checking test results ...');

    await checkNodeResults();

};
