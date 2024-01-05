const fs = require('fs');
const v8 = require('v8');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const CoverageReport = require('../');

// test lib app
const {
    foo, bar, app
} = require('./mock/node/lib/app.js');
// test dist with sourcemap
const { component, branch } = require('./mock/node/dist/coverage-node.js');

const dir = process.env.NODE_V8_COVERAGE;
// remove previous coverage files
if (fs.existsSync(dir)) {
    fs.rmSync(dir, {
        recursive: true,
        force: true
    });
    console.log(`removed previous: ${dir}`);
}

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',

    name: 'My V8 Node api Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/v8-node-api'
};

const generate = async () => {

    const coverageReport = new CoverageReport(coverageOptions);

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

        // console.log(coverageList);

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

    await coverageReport.generate();

    EC.logGreen('done');

};

const test = async () => {

    foo();
    bar();
    app();
    // v8.takeCoverage();

    console.log(component, branch);

    component();
    branch();
    v8.takeCoverage();

    // stop
    v8.stopCoverage();

    await generate();

};


test();
