module.exports = {

    // logging: 'debug',

    name: 'My MCR Coverage Report',

    outputDir: 'docs/mcr',

    reports: [
        'v8',
        'console-summary',
        'codecov',
        ['markdown-summary', {
            // color: 'html'
        }],
        ['markdown-details', {
            // color: 'Tex',
            maxCols: 80,
            baseUrl: 'https://cenfun.github.io/monocart-coverage-reports/mcr/#page=',
            metrics: ['bytes', 'lines']
        }]
    ],

    assetsPath: '../assets',
    lcov: true,

    onStart: async (coverageReport) => {

    },

    entryFilter: (entry) => {
        if (entry.url.includes('node_modules')) {
            return false;
        }

        if (entry.url.includes('packages/')) {
            return false;
        }

        return true;
    },

    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,

    all: {
        dir: 'lib',
        filter: {
            // '**/monocart-*.js': false,
            '**/*.html': false,
            '**/*.ts': false,
            '**/*': true
        }
    },

    onEnd: async (coverageResults) => {

    }

};
