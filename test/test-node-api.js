const fs = require('fs');
const v8 = require('v8');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const MCR = require('../');

const dir = process.env.NODE_V8_COVERAGE;

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8', 'v8-json'],

    name: 'My V8 Node api Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/node-api'
};

const generate = async () => {

    const coverageReport = MCR(coverageOptions);

    // clean cache before add coverage data
    coverageReport.cleanCache();

    const files = fs.readdirSync(dir);
    for (const filename of files) {
        const content = fs.readFileSync(path.resolve(dir, filename)).toString('utf-8');
        const json = JSON.parse(content);
        let coverageList = json.result;

        // filter node internal files
        coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

        // console.log(coverageList);
        coverageList = coverageList.filter((entry) => entry.url.includes('test/mock/node'));

        if (!coverageList.length) {
            continue;
        }

        // attached source content
        coverageList.forEach((entry) => {
            const filePath = fileURLToPath(entry.url);
            if (fs.existsSync(filePath)) {
                entry.source = fs.readFileSync(filePath).toString('utf8');
            } else {
                EC.logRed('not found file', filePath);
            }
        });

        await coverageReport.add(coverageList);
    }

    const coverageResults = await coverageReport.generate();
    console.log('test-node-api coverage reportPath', EC.magenta(coverageResults.reportPath));

};

const test = () => {

    // silent
    const log = console.log;
    console.log = () => {};

    // test lib app
    const {
        foo, bar, app
    } = require('./mock/node/lib/app.js');
    // test dist with sourcemap
    const { component, branch } = require('./mock/node/dist/coverage-node.js');

    foo();
    bar();
    app();

    component();
    branch();

    console.log = log;

    v8.takeCoverage();

    // stop will cased ''result' from coverage profile response is not an object'
    // v8.stopCoverage();

};


const main = async () => {

    // remove previous coverage files
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, {
            recursive: true,
            force: true
        });
        console.log(`removed previous: ${dir}`);
    }

    test();

    await generate();
};

main();
