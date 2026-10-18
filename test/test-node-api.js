import fs from 'node:fs';
import v8 from 'node:v8';
import EC from 'eight-colors';

import { MCR } from '../lib/index.js';
import checkSnapshot from './check-snapshot.js';
const dir = process.env.NODE_V8_COVERAGE;

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8'],

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
    await import('./specs/node.test.js');
    // =====================================================

    v8.takeCoverage();

    // stop will cased ''result' from coverage profile response is not an object'
    // v8.stopCoverage();

    await generate();
};

main();
