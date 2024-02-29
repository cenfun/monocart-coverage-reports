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

    name: 'My V8 Rollup Coverage Report',

    outputDir: './docs/rollup',
    onEnd: function(coverageResults) {
        checkSnap(coverageResults);
    }
};

const test1 = async (serverUrl) => {

    console.log('start rollup test1 ...');
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

    const url = `${serverUrl}/rollup/`;

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
    console.log('rollup coverage1 added', results.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start rollup test2 ...');
    const browser = await chromium.launch({
        // headless: false
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

    const url = `${serverUrl}/rollup/`;

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
    console.log('rollup coverage2 added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate rollup coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('rollup coverage reportPath', EC.magenta(coverageResults.reportPath));
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
