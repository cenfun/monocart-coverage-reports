const fs = require('fs');
const path = require('path');
const assert = require('assert');
const EC = require('eight-colors');

const getJson = (p) => {
    return JSON.parse(fs.readFileSync(path.resolve(`./docs/${p}/coverage-report.json`)));
};

const checkNodeResults = () => {
    console.log('checking 4 node results should be same');

    // fgc can not run in GA ci
    const list = ['api', 'cdp', 'env', 'ins'].map((it) => {
        const json = getJson(`node-${it}`);
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

    const pJson = getJson('v8');
    const pName = pJson.name;
    delete pJson.name;
    const p = {
        name: pName,
        json: pJson
    };

    const cJson = getJson('puppeteer');
    const cName = cJson.name;
    delete cJson.name;
    const c = {
        name: cName,
        json: cJson
    };

    assert.deepStrictEqual(p.json, c.json, `failed to check: ${p.name} != ${c.name}`);
    console.log(`${p.name} ${EC.green('=')} ${c.name}`);

};

const checkKoaResults = () => {
    console.log('checking koa results');
    const json = getJson('node-koa');
    const summary = '{"bytes":{"total":472,"covered":398,"uncovered":74,"pct":84.32,"status":"high"},"statements":{"total":13,"covered":11,"uncovered":2,"pct":84.62,"status":"high"},"branches":{"total":2,"covered":1,"uncovered":1,"pct":50,"status":"medium"},"functions":{"total":3,"covered":2,"uncovered":1,"pct":66.67,"status":"medium"},"lines":{"total":17,"covered":11,"blank":6,"comment":0,"uncovered":6,"pct":64.71,"status":"medium"}}';
    const jsonSummary = JSON.parse(summary);

    // do not check bytes, the EOL is different: /r/n or only /n between windows and linux
    delete json.summary.bytes;
    delete jsonSummary.bytes;

    assert.deepStrictEqual(json.summary, jsonSummary, 'failed to check koa summary');
};

module.exports = async () => {
    console.log('checking test results ...');
    try {
        await checkV8PuppeteerResults();
        await checkNodeResults();
        await checkKoaResults();
    } catch (e) {
        EC.logRed(e.message);
        throw new Error(e);
    }

    EC.logGreen('check test done');
};
