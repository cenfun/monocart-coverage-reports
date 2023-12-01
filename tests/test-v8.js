const { chromium } = require('playwright');

const CoverageReport = require('../');

const coverageOptions = {
    name: 'My V8 Coverage Report',
    outputFile: 'docs/v8/index.html',
    assetsPath: '../assets',
    logging: 'debug'
};

const test1 = async (serverUrl) => {

    console.log('start test1 ...');
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

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageList);
    console.log('coverage1 added', report.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start test2 ...');
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

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    const coverageList = [... jsCoverage, ... cssCoverage];

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageList);
    console.log('coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate coverage reports ...');

    const coverageReport = new CoverageReport(coverageOptions);
    const results = await coverageReport.generate();

    console.log('coverage generated', results.summary);
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
