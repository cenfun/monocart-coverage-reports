const { chromium } = require('playwright');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    name: 'My V8 Minify Coverage Report',
    outputFile: 'docs/v8-minify/index.html',
    assetsPath: '../assets'
};

const test1 = async (serverUrl) => {

    console.log('start v8-minify test1 ...');
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

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageList);
    console.log('v8-minify coverage1 added', report.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start v8-minify test2 ...');
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

    const coverageReport = new CoverageReport(coverageOptions);
    const report = await coverageReport.add(coverageList);
    console.log('v8-minify coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate v8-minify coverage reports ...');

    const coverageReport = new CoverageReport(coverageOptions);
    const results = await coverageReport.generate();

    console.log('v8-minify coverage generated', results.summary);
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
