const { chromium } = require('playwright');
const EC = require('eight-colors');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            name: 'My V8 Esbuild Coverage Report',
            assetsPath: '../assets'
        }]
    ],
    outputDir: './docs/v8-esbuild'
};

const test1 = async (serverUrl) => {

    console.log('start v8-esbuild test1 ...');
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

    const results = await new CoverageReport(coverageOptions).add(coverageList);
    console.log('v8-esbuild coverage1 added', results.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start v8-esbuild test2 ...');
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

    const results = await new CoverageReport(coverageOptions).add(coverageList);
    console.log('v8-esbuild coverage2 added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate v8-esbuild coverage reports ...');

    const coverageResults = await new CoverageReport(coverageOptions).generate();
    console.log('reportPath', EC.magenta(coverageResults.reportPath));

    console.log('v8-esbuild coverage generated', coverageResults.summary);
};


module.exports = async (serverUrl) => {
    // clean cache first if debug
    if (coverageOptions.logging === 'debug') {
        await new CoverageReport(coverageOptions).clean();
    }

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
