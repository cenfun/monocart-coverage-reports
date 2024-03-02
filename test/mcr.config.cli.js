const checkSnapshot = require('./check-snapshot.js');
module.exports = {

    // logging: 'debug',

    name: 'My CLI Coverage Report',

    reports: 'v8,console-summary,raw,codecov',

    assetsPath: '../assets',

    lcov: true,

    onStart: async (coverageReport) => {

    },

    // sourcePath: (filePath) => {
    //     const pre = 'monocart-coverage-reports/';
    //     if (filePath.startsWith(pre)) {
    //         return filePath.slice(pre.length);
    //     }
    //     return filePath;
    // },
    sourcePath: {
        'monocart-coverage-reports/': ''
    },

    // entryFilter: (entry) => {
    //     return entry.url.includes('mock/node') || entry.url.search(/src\/.+/) !== -1;
    // },
    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,

    // entryFilter: '{**/mock/node/**,**/src/**}',
    // sourceFilter: '**/src/**',


    entryFilter: {
        // '**/node/lib/*': false,
        '**/mock/node/**': true,
        '**/src/**': true
    },

    sourceFilter: {
        // '**/ignore/**': false,
        '**/src/**': true
    },

    all: ['test/mock/src', 'test/mock/node/lib'],

    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }

};
