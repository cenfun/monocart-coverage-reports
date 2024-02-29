const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');
const checkSnap = require('./check-snap.js');
const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            assetsPath: '../assets'
        }]
    ],
    name: 'My V8 Esbuild Coverage Report',

    outputDir: './docs/esbuild',
    onEnd: function(coverageResults) {
        checkSnap(coverageResults);
    }
};

const test = async (serverUrl) => {

    console.log('start esbuild test1 ...');
    const browser = await chromium.launch({
        //  headless: false
    });
    const page = await browser.newPage();

    await Promise.all([
        page.coverage.startJSCoverage({
            resetOnNavigation: false
        }),
        page.coverage.startCSSCoverage({
            resetOnNavigation: false
        })
    ]);

    const url = `${serverUrl}/esbuild/`;

    console.log(`goto ${url}`);

    await page.goto(url);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const results = await MCR(coverageOptions).add(coverageList);
    console.log('esbuild coverage1 added', results.type);

    await browser.close();
};

const generate = async () => {

    console.log('generate esbuild coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('esbuild coverage reportPath', EC.magenta(coverageResults.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test(serverUrl);

    await generate();
};
