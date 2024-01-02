const { chromium } = require('playwright');
const EC = require('eight-colors');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        ['console-summary', {
            // metrics: ['lines']
        }],
        // v8 will be ignored if input data istanbul
        'v8',
        ['html'],
        ['json'],
        ['html-spa', {
            subdir: 'html-spa'
        }]
    ],
    lcov: true,
    name: 'My Istanbul Report',
    outputDir: './docs/istanbul'
};

const test1 = async (serverUrl) => {

    console.log('start istanbul test1 ...');
    const browser = await chromium.launch({
        //  headless: false
    });
    const page = await browser.newPage();

    const url = `${serverUrl}/istanbul/`;

    console.log(`goto ${url}`);

    await page.goto(url);

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

    const results = await new CoverageReport(coverageOptions).add(coverageData);

    console.log('istanbul coverage1 added', results.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start istanbul test2 ...');
    const browser = await chromium.launch({
        // headless: false
    });
    const page = await browser.newPage();

    const url = `${serverUrl}/istanbul/`;

    console.log(`goto ${url}`);

    await page.goto(url);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    await page.evaluate(() => {
        const { start } = window['coverage-istanbul'];
        start();
    });

    const coverageData = await page.evaluate(() => window.__coverage__);

    const results = await new CoverageReport(coverageOptions).add(coverageData);

    console.log('istanbul coverage2 added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate istanbul coverage reports ...');

    const coverageResults = await new CoverageReport(coverageOptions).generate();

    console.log('istanbul coverage reportPath', EC.magenta(coverageResults.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first if debug
    await new CoverageReport(coverageOptions).cleanCache();

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
