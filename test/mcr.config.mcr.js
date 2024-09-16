module.exports = {

    // logging: 'debug',

    name: 'My MCR Coverage Report',

    outputDir: 'docs/mcr',

    reports: [
        'v8',
        'v8-json',
        'console-summary',
        'codecov',
        ['markdown-summary', {
            // color: 'html'
        }],
        ['markdown-details', {
            // color: 'Tex',
            maxCols: 50,
            baseUrl: 'https://cenfun.github.io/monocart-coverage-reports/mcr/#page=',
            metrics: ['bytes', 'lines']
        }]
    ],

    assetsPath: '../assets',
    lcov: true,

    onStart: async (coverageReport) => {

    },

    entryFilter: {
        '**/node_modules/**': false,
        '**/lib/packages/**': false,
        '**/lib/**': true
    },

    sourceFilter: {
        '**/lib/packages/**': false,
        '**/lib/**': true
    },

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
