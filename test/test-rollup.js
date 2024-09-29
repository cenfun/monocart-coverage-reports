const { chromium } = require('playwright');
const EC = require('eight-colors');

const serve = require('./serve.js');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            assetsPath: '../assets'
        }]
    ],

    name: 'My V8 Rollup Coverage Report',

    filter: {
        '**/commonjs-entry': false,
        '**/*': true
    },

    outputDir: './docs/rollup',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const test = async (serverUrl) => {

    console.log('start rollup test ...');
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

    console.log(`goto ${serverUrl}`);

    await page.goto(serverUrl);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const results = await MCR(coverageOptions).add(coverageList);
    console.log('rollup coverage added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate rollup coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('rollup coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {

    const { server, serverUrl } = await serve(8150, 'rollup');

    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test(serverUrl);

    server.close();

    await generate();
};

main();
