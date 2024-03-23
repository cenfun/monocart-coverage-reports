const EC = require('eight-colors');

const { foregroundChild } = require('foreground-child');

const MCR = require('../');
const dir = '.temp/v8-coverage-fgc';

const checkSnapshot = require('./check-snapshot.js');
const generate = async () => {

    const coverageOptions = {
        // logging: 'debug',
        // watermarks: [60, 90],
        reports: ['v8'],

        name: 'My V8 Node fgc Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        entryFilter: {
            '**/test/mock/node/**': true
        },

        outputDir: './docs/node-fgc',
        onEnd: function(coverageResults) {
            checkSnapshot(coverageResults);
        }
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
    foregroundChild('node ./test/test-node-env.js', {
        shell: true
    }, async () => {
        await generate();

        return process.exitCode;
    });
};

test();
