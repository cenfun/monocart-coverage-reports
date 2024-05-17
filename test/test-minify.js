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
        // ['console-details', {
        //     skipPercent: 80,
        //     metrics: ['bytes', 'functions', 'lines']
        // }],
        // ['cobertura']
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
        setTimeout(resolve, 2000);
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const results = await MCR(coverageOptions).add(coverageList);
    console.log('minify coverage added', results.type);

    // await new Promise((resolve) => {
    //     page.on('close', () => {
    //         resolve();
    //     });
    //     setTimeout(resolve, 10 * 60 * 1000);
    // });

    await browser.close();
};


const generate = async () => {

    console.log('generate minify coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('minify coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {

    const { server, serverUrl } = await serve(8130, 'minify');

    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test(serverUrl);

    server.close();

    await generate();
};

main();
