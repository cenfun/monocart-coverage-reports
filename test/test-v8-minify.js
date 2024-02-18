const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');

const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            assetsPath: '../assets'
        }],
        ['cobertura']
    ],

    name: 'My V8 Minify Coverage Report',
    sourcePath: (filePath) => {
        return filePath.replace(/&/g, '&amp;');
    },

    outputDir: './docs/v8-minify'
};

const test = async (serverUrl) => {

    console.log('start v8-minify test ...');
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
    console.log('v8-minify coverage added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate v8-minify coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('v8-minify coverage reportPath', EC.magenta(coverageResults.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();
    await test(serverUrl);
    await generate();
};
