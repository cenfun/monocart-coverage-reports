import EC from 'eight-colors';

import { execa } from 'execa';

import { MCR } from '../lib/index.js';
const dir = '.temp/v8-coverage-fgc';

import checkSnapshot from './check-snapshot.js';
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

const test = async () => {
    process.env.NODE_V8_COVERAGE = dir;

    const result = await execa(process.execPath, ['./test/test-node-env.js'], {
        stdio: 'inherit',
        reject: false
    });
    await generate();
    process.exitCode = result.exitCode ?? 1;
};

test().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
