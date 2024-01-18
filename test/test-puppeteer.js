const PCR = require('puppeteer-chromium-resolver');
const EC = require('eight-colors');

const MCR = require('../');

const options = {};
const stats = PCR.getStats(options);

// v8 and lcov
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        ['console-summary', {
            // metrics: ['bytes', 'functions', 'lines']
        }],
        ['v8', {
            // metrics: ['bytes', 'functions', 'lines']
        }]
    ],

    name: 'My puppeteer Coverage Report',
    assetsPath: '../assets',
    lcov: true,

    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1 || sourcePath.search(/minify\//) !== -1,
    outputDir: './docs/puppeteer'
};

const test1 = async (serverUrl) => {

    console.log('start puppeteer test1 ...');

    const browser = await stats.puppeteer.launch({
        // headless: false,
        args: ['--no-sandbox'],
        executablePath: stats.executablePath
    });

    const page = await browser.newPage();

    await Promise.all([
        page.coverage.startJSCoverage({
            resetOnNavigation: false,
            includeRawScriptCoverage: true
        }),
        page.coverage.startCSSCoverage({
            resetOnNavigation: false
        })
    ]);

    // Playwright: By default, the Playwright tests run on a default viewport size of 1280x720 .
    // Puppeteer: Defaults to an 800x600 viewport.
    await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1
    });

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

    // to raw V8 script coverage
    const coverageList = [... jsCoverage.map((it) => {
        return {
            source: it.text,
            ... it.rawScriptCoverage
        };
    }), ... cssCoverage];

    // v8
    const report = await MCR(coverageOptions).add(coverageList);

    console.log('puppeteer coverage1 added', report.type);

    await browser.close();
};


const test2 = async (serverUrl) => {

    console.log('start puppeteer test2 ...');

    const browser = await stats.puppeteer.launch({
        // headless: false,
        args: ['--no-sandbox'],
        executablePath: stats.executablePath
    });

    const page = await browser.newPage();

    await Promise.all([
        page.coverage.startJSCoverage({
            resetOnNavigation: false,
            includeRawScriptCoverage: true
        }),
        page.coverage.startCSSCoverage({
            resetOnNavigation: false
        })
    ]);

    await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1
    });

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

    // to raw V8 script coverage
    const coverageList = [... jsCoverage.map((it) => {
        return {
            source: it.text,
            ... it.rawScriptCoverage
        };
    }), ... cssCoverage];

    const report = await MCR(coverageOptions).add(coverageList);

    console.log('puppeteer coverage2 added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate puppeteer coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('puppeteer coverage reportPath', EC.magenta(coverageResults.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await Promise.all([
        test1(serverUrl),
        test2(serverUrl)
    ]);

    await generate();
};
