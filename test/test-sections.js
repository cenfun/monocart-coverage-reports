const { chromium } = require('playwright');
const EC = require('eight-colors');

const serve = require('./serve.js');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    logging: 'debug',
    reports: [
        ['v8', {
            assetsPath: '../assets'
        }],
        ['console-details', {

        }]
    ],

    name: 'My V8 Sections Coverage Report',

    outputDir: './docs/sections',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const test = async (serverUrl) => {

    console.log('start sections test ...');
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

    console.log(`goto ${serverUrl}`);

    await page.goto(serverUrl);

    // time for minify fps-detector
    await new Promise((resolve) => {
        setTimeout(resolve, 100);
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const results = await MCR(coverageOptions).add(coverageList);
    console.log('sections coverage added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate sections coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('sections coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {

    const { server, serverUrl } = await serve(8170, 'sections');

    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test(serverUrl);

    server.close();

    await generate();
};

main();
