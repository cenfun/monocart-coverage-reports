const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const { foregroundChild } = require('foreground-child');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const dir = '.temp/v8-coverage-fgc';

const generate = async () => {

    const coverageOptions = {
        // logging: 'debug',
        // watermarks: [60, 90],
        reports: ['v8', 'console-summary'],

        name: 'My V8 Node fgc Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        outputDir: './docs/node-fgc',
        onEnd: function(coverageResults) {
            checkSnapshot(coverageResults);
        }
    };


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
    console.log('test-node-fgc coverage reportPath', EC.magenta(coverageResults.reportPath));

};

const test = () => {
    process.env.NODE_V8_COVERAGE = dir;

    // NOT work in github actions
    const testPath = path.resolve('./test/test-node-env.js');
    foregroundChild(`node ${testPath}`, async () => {
        await generate();

        // exit code for foregroundChild
        return 0;
    });
};

test();
