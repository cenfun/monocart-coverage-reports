const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            assetsPath: '../assets'
        }],
        // ['console-details', {
        //     skipPercent: 80,
        //     metrics: ['bytes', 'functions', 'lines']
        // }],
        ['cobertura']
    ],

    name: 'My V8 Minify Coverage Report',
    sourcePath: (filePath) => {
        return filePath.replace(/&/g, '&amp;');
    },

    outputDir: './docs/minify',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const test = async (serverUrl) => {

    console.log('start minify test ...');
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

    const url = `${serverUrl}/minify/`;

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
    console.log('minify coverage added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate minify coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('minify coverage reportPath', EC.magenta(coverageResults.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();
    await test(serverUrl);
    await generate();
};
