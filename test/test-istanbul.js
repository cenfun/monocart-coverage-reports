const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        ['console-details', {
            metrics: ['lines']
        }],
        // ['console-summary', {
        // metrics: ['lines']
        // }],
        'codecov',
        // v8 will be ignored if input data istanbul
        'v8',
        'raw',
        ['html'],
        // ['text'],
        ['json']
        // ['html-spa', {
        //     subdir: 'html-spa'
        // }]
    ],
    lcov: true,
    name: 'My Istanbul Report',

    all: {
        dir: ['test/mock/src']
    },

    outputDir: './docs/istanbul',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const test = async () => {

    console.log('start istanbul test ...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.addScriptTag({
        path: './test/mock/istanbul/dist/coverage-istanbul.js'
    });

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    await page.evaluate(() => {
        const { foo } = window['coverage-istanbul'];
        foo();
    });

    await page.evaluate(() => {
        const { bar } = window['coverage-istanbul'];
        bar();
    });

    const coverageData = await page.evaluate(() => window.__coverage__);

    const results = await MCR(coverageOptions).add(coverageData);

    console.log('istanbul coverage added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate istanbul coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    // console.log('istanbul coverageResults', Object.keys(coverageResults));
    console.log('istanbul coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {
    await MCR(coverageOptions).cleanCache();
    await test();
    await generate();
};

main();
