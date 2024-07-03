const fs = require('fs');
const v8 = require('v8');
const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const dir = process.env.NODE_V8_COVERAGE;

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8', 'v8-json'],

    name: 'My V8 Node api Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    dataDir: dir,

    entryFilter: {
        '**/test/mock/node/**': true
    },

    outputDir: './docs/node-api',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const generate = async () => {

    const coverageReport = MCR(coverageOptions);

    // clean cache before add coverage data
    coverageReport.cleanCache();

    const coverageResults = await coverageReport.generate();
    console.log('test-node-api coverage reportPath', EC.magenta(coverageResults.reportPath));

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

    // =====================================================
    require('./specs/node.test.js');
    // =====================================================

    v8.takeCoverage();

    // stop will cased ''result' from coverage profile response is not an object'
    // v8.stopCoverage();

    await generate();
};

main();
