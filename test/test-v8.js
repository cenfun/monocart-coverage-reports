const { chromium } = require('playwright');
const EC = require('eight-colors');

const CoverageReport = require('../');

// v8 and lcov
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',

    name: 'My V8 Coverage Report',
    assetsPath: '../assets',
    lcov: true,

    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1 || sourcePath.search(/minify\//) !== -1,

    outputDir: './docs/v8'
};

const test1 = async (serverUrl) => {

    console.log('start v8 test1 ...');
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

    const url = `${serverUrl}/v8/`;

    console.log(`goto ${url}`);

    await page.goto(url);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    await page.evaluate(() => {
        const { foo } = window['coverage-v8'];
        foo();
    });

    await page.evaluate(() => {
        const { bar } = window['coverage-v8'];
        bar();
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    // v8
    const report = await new CoverageReport(coverageOptions).add(coverageList);

    console.log('v8 coverage1 added', report.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start v8 test2 ...');
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

    const url = `${serverUrl}/v8/`;

    console.log(`goto ${url}`);

    await page.goto(url);

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    await page.evaluate(() => {
        const { start } = window['coverage-v8'];
        start();
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const report = await new CoverageReport(coverageOptions).add(coverageList);

    console.log('v8 coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate v8 coverage reports ...');

    const coverageResults = await new CoverageReport(coverageOptions).generate();
    console.log('reportPath', EC.magenta(coverageResults.reportPath));
    console.log('v8 coverage generated', Object.keys(coverageResults.summary).map((k) => [k, coverageResults.summary[k].pct]));

};


module.exports = async (serverUrl) => {
    // clean cache first if debug
    if (coverageOptions.logging === 'debug') {
        await new CoverageReport(coverageOptions).cleanCache();
    }

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
