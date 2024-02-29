const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
// v8 and lcov
const coverageOptions = {
    // logging: 'debug',
    name: 'My Anonymous Coverage Report',
    assetsPath: '../assets',
    outputDir: './docs/anonymous',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const test = async () => {

    console.log('start anonymous test ...');
    const browser = await chromium.launch({
        //  headless: false
    });
    const page = await browser.newPage();

    // JavaScript Coverage doesn't include anonymous scripts by default.
    await page.coverage.startJSCoverage({
        reportAnonymousScripts: true,
        resetOnNavigation: false
    });
    await page.setContent(`<html>
            <head>
                <title>mock page anonymous</title>
            </head>
            <body>
                mock page anonymous
            </body>
            </html>`);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    const jsCoverage = await page.coverage.stopJSCoverage();
    await page.close();

    const coverageList = [... jsCoverage];

    // v8
    const report = await MCR(coverageOptions).add(coverageList);

    console.log('anonymous coverage added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate anonymous coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('anonymous coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test();

    await generate();
};

main();
