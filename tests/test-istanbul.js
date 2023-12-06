const { chromium } = require('playwright');
const EC = require('eight-colors');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        // v8 will be ignore for istanbul data
        'v8',
        ['html-spa', {
            subdir: 'html-spa'
        }],
        ['html', {
            subdir: 'html'
        }],
        'lcovonly'
    ],
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

    const report = await new CoverageReport(coverageOptions).generate();

    console.log('htmlPath', EC.magenta(report.htmlPath));

    console.log('istanbul coverage generated', report.summary);
};


module.exports = async (serverUrl) => {
    // clean cache first if debug
    if (coverageOptions.logging === 'debug') {
        await new CoverageReport(coverageOptions).clean();
    }

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
