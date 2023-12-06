const { chromium } = require('playwright');
const EC = require('eight-colors');

const CoverageReport = require('../');

const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            name: 'My V8 Minify Coverage Report',
            assetsPath: '../assets'
        }]
    ],
    outputDir: './docs/v8-minify'
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

    const results = await new CoverageReport(coverageOptions).add(coverageList);
    console.log('v8-minify coverage1 added', results.type);

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

    const results = await new CoverageReport(coverageOptions).add(coverageList);
    console.log('v8-minify coverage2 added', results.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate v8-minify coverage reports ...');

    const report = await new CoverageReport(coverageOptions).generate();
    console.log('htmlPath', EC.magenta(report.htmlPath));

    console.log('v8-minify coverage generated', report.summary);
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
