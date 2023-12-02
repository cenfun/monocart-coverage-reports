const { chromium } = require('playwright');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    outputFile: 'docs/istanbul/index.html'
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

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageData);
    console.log('istanbul coverage1 added', report.type);

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

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageData);
    console.log('istanbul coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate istanbul coverage reports ...');

    const coverageReport = new CoverageReport(coverageOptions);
    const results = await coverageReport.generate();

    console.log('istanbul coverage generated', results.summary);
};


module.exports = async (serverUrl) => {
    // clean cache first if debug
    if (coverageOptions.logging === 'debug') {
        const coverageReport = new CoverageReport(coverageOptions);
        await coverageReport.clean();
    }

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
