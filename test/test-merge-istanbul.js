const EC = require('eight-colors');

const MCR = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        ['html']
    ],

    // merge from exists raw dirs
    inputDir: [
        './docs/istanbul/raw',
        '../jest-monocart-coverage/docs/istanbul/raw'
    ],

    name: 'My Merged Istanbul Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    // istanbul file path is absolute path
    sourcePath: (filePath) => {
        filePath = filePath.replace(/\\/g, '/');
        const list = ['monocart-coverage-reports/test/mock/', 'jest-monocart-coverage/'];
        for (const str of list) {
            const index = filePath.indexOf(str);
            if (index !== -1) {
                return filePath.slice(index + str.length);
            }
        }
        return filePath;
    },

    outputDir: './docs/merge-istanbul'
};

const generate = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    console.log('generate merge coverage reports ...');
    const coverageResults = await MCR(coverageOptions).generate();
    console.log('merge coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
