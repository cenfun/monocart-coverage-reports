const path = require('path');
const EC = require('eight-colors');

const { foregroundChild } = require('foreground-child');

const MCR = require('../');
const dir = '.temp/v8-coverage-fgc';

const generate = async () => {

    const coverageOptions = {
        // logging: 'debug',
        // watermarks: [60, 90],
        reports: ['v8', 'console-summary'],

        name: 'My V8 Node fgc Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        entryFilter: {
            '**/test/mock/node/**': true
        },

        outputDir: './docs/node-fgc'

    };


    const coverageReport = MCR(coverageOptions);

    // clean cache before add coverage data
    coverageReport.cleanCache();

    await coverageReport.addFromDir(dir);
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
