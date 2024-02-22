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
    const list = ['api', 'cdp', 'env', 'ins'].map((it) => {
        const json = getJson(path.resolve(`./docs/v8-node-${it}/coverage-report.json`));
        // should be same except name
        const name = json.name;
        delete json.name;
        return {
            name,
            json
        };
    });

    list.reduce((p, c) => {

        assert.deepStrictEqual(p.json, c.json, `failed to check: ${p.name} != ${c.name}`);
        console.log(`${p.name} ${EC.green('=')} ${c.name}`);

        return c;
    });

};

const checkV8PuppeteerResults = () => {
    console.log('checking V8 and Puppeteer results should be same');

    const pJson = getJson(path.resolve('./docs/v8/coverage-report.json'));
    const pName = pJson.name;
    delete pJson.name;
    const p = {
        name: pName,
        json: pJson
    };

    const cJson = getJson(path.resolve('./docs/puppeteer/coverage-report.json'));
    const cName = cJson.name;
    delete cJson.name;
    const c = {
        name: cName,
        json: cJson
    };

    assert.deepStrictEqual(p.json, c.json, `failed to check: ${p.name} != ${c.name}`);
    console.log(`${p.name} ${EC.green('=')} ${c.name}`);

};

module.exports = async () => {
    console.log('checking test results ...');
    try {
        await checkV8PuppeteerResults();
        await checkNodeResults();
    } catch (e) {
        EC.logRed(e.message);
        throw new Error(e);
    }

    EC.logGreen('check test done');
};
