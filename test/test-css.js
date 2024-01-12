const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');

// v8 and lcov
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',
    name: 'My Css Coverage Report',
    assetsPath: '../assets',
    lcov: true,
    outputDir: './docs/css'
};

const test1 = async (serverUrl) => {

    console.log('start css test1 ...');
    const browser = await chromium.launch({
        //  headless: false
    });
    const page = await browser.newPage();

    await page.coverage.startCSSCoverage({
        resetOnNavigation: false
    });

    const url = `${serverUrl}/css/`;

    console.log(`goto ${url}`);

    await page.goto(url);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    // take screenshot
    await page.screenshot({
        path: '.temp/css-screenshot1.png'
    });

    const coverageData = await page.coverage.stopCSSCoverage();

    console.log(coverageData.map((it) => it.url));

    // v8
    const report = await MCR(coverageOptions).add(coverageData);

    console.log('css coverage1 added', report.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start css test2 ...');
    const browser = await chromium.launch({
        // headless: false
    });
    const page = await browser.newPage();

    await page.coverage.startCSSCoverage({
        resetOnNavigation: false
    });

    const url = `${serverUrl}/css/`;

    console.log(`goto ${url}`);

    await page.goto(url);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    // take screenshot
    await page.screenshot({
        path: '.temp/css-screenshot2.png'
    });

    const coverageData = await page.coverage.stopCSSCoverage();

    console.log(coverageData.map((it) => it.url));

    const report = await MCR(coverageOptions).add(coverageData);

    console.log('css coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate css coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('css coverage reportPath', EC.magenta(coverageResults.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
