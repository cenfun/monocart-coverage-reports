const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const { foregroundChild } = require('foreground-child');

const CoverageReport = require('../');

const dir = '.temp/v8-coverage-fgc';

const generate = async () => {

    const coverageOptions = {
        // logging: 'debug',
        // watermarks: [60, 90],
        reports: 'v8',

        name: 'My V8 Node foreground-child Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        outputDir: './docs/v8-node-fgc'
    };


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

    await coverageReport.generate();

    EC.logGreen('done');

    // exit code for foregroundChild
    return 0;
};

const test = () => {
    process.env.NODE_V8_COVERAGE = dir;

    const testPath = path.resolve('./test/test-node-env.js');
    foregroundChild(`node ${testPath}`, () => {
        return generate();
    });
};

test();
