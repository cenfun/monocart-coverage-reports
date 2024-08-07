const checkSnapshot = require('./check-snapshot.js');
module.exports = {

    // logging: 'debug',

    name: 'My TSX Coverage Report',

    reports: 'v8,console-details',

    outputDir: 'docs/tsx',

    assetsPath: '../assets',

    entryFilter: {
        '**/test/specs/**': true
    },

    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }

};
