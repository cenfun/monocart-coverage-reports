const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const generate = async () => {

    const dir = '.temp/v8-coverage-env';


    const coverageOptions = {
        // logging: 'debug',
        // watermarks: [60, 90],
        reports: ['v8'],

        name: 'My V8 Node env Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        dataDir: dir,

        entryFilter: {
            '**/test/mock/node/**': true
        },

        outputDir: './docs/node-env',

        onEnd: function(coverageResults) {
            checkSnapshot(coverageResults);
        }
    };

    const coverageReport = MCR(coverageOptions);
    // clean cache before add coverage data
    coverageReport.cleanCache();

    const coverageResults = await coverageReport.generate();
    console.log('test-node-env coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
