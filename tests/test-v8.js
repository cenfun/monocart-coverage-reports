const { chromium } = require('playwright');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    name: 'My V8 Coverage Report',
    assetsPath: '../assets',
    lcov: true,

    outputFile: 'docs/v8/index.html'
};

const toIstanbulOptions = {
    // logging: 'debug',

    toIstanbul: true,
    // toIstanbul: 'html',

    lcov: true,

    // https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib
    // toIstanbul: ['html', {
    //     name: 'json',
    //     options: {
    //         file: 'my-json-file.json'
    //     }
    // }],

    outputFile: 'docs/v8-to-istanbul/index.html'
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

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageList);

    // to istanbul
    await new CoverageReport(toIstanbulOptions).add(coverageList);

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

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageList);

    // to istanbul
    await new CoverageReport(toIstanbulOptions).add(coverageList);

    console.log('v8 coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate v8 coverage reports ...');

    const coverageReport = new CoverageReport(coverageOptions);
    const results = await coverageReport.generate();

    // to istanbul
    await new CoverageReport(toIstanbulOptions).generate();

    console.log('v8 coverage generated', results.summary);
};


module.exports = async (serverUrl) => {
    // clean cache first if debug
    if (coverageOptions.logging === 'debug') {
        const coverageReport = new CoverageReport(coverageOptions);
        await coverageReport.clean();
    }

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
