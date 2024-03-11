const EC = require('eight-colors');
const { chromium } = require('playwright');
const PCR = require('puppeteer-chromium-resolver');

const MCR = require('../');
const CDPClient = MCR.CDPClient;

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [

        // ['console-details', {
        //     maxCols: 20
        // }],

        'v8'
    ],

    name: 'My V8 Client Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/client'
};

const testPlaywright = async (coverageReport) => {
    // =====================================================
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const session = await page.context().newCDPSession(page);
    const client = await CDPClient({
        session
    });

    await client.startCoverage();

    await page.setContent(`<html>
    <head>
        <title>mock playwright anonymous</title>
        <style>
            body { font-size: 16px; }
            h3 { display: block; }
            .unused {
                border: 1px solid #ccc;
            }
        </style>
        <style>
            .playwright {
                color: green;
            }
            /*# sourceURL=playwright.css*/
        </style>
    </head>
    <body>
        mock page anonymous
        <div class="playwright">playwright<div>
        <script>
            const name = "playwright";
        </script>
        <script>
            const sourceURL = "playwright";
            //# sourceURL=playwright.js
        </script>
    </body>
    </html>`);

    const coverageData = await client.stopCoverage();

    await client.close();
    await browser.close();

    await coverageReport.add(coverageData);
};

const testPuppeteer = async (coverageReport) => {
    const stats = PCR.getStats({});
    const browser = await stats.puppeteer.launch({
        // headless: false,
        args: ['--no-sandbox'],
        executablePath: stats.executablePath
    });

    const page = await browser.newPage();
    // Playwright: By default, the Playwright tests run on a default viewport size of 1280x720 .
    // Puppeteer: Defaults to an 800x600 viewport.
    await page.setViewport({
        width: 1280,
        height: 720,
        deviceScaleFactor: 1
    });

    const session = await page.target().createCDPSession();
    const client = await CDPClient({
        session
    });

    await client.startCoverage();

    await page.setContent(`<html>
    <head>
        <title>mock puppeteer anonymous</title>
        <style>
            body { font-size: 16px; }
            h3 { display: block; }
            .unused {
                border: 1px solid #ccc;
            }
        </style>
        <style>
            .puppeteer {
                color: green;
            }
            /*# sourceURL=puppeteer.css*/
        </style>
    </head>
    <body>
        mock page anonymous
        <div class="puppeteer">puppeteer<div>
        <script>
            const name = "puppeteer";
        </script>
        <script>
            const sourceURL = "puppeteer";
            //# sourceURL=puppeteer.js
        </script>
    </body>
    </html>`);

    const coverageData = await client.stopCoverage();

    await client.close();
    await browser.close();

    await coverageReport.add(coverageData);

};

const generate = async () => {
    // clean cache first
    const coverageReport = MCR(coverageOptions);
    coverageReport.cleanCache();

    await testPlaywright(coverageReport);
    await testPuppeteer(coverageReport);

    // test node see test-node-cdp

    if (coverageReport.hasCache()) {
        const coverageResults = await coverageReport.generate();
        console.log('test client coverage reportPath', EC.magenta(coverageResults.reportPath));
    }

};

generate();
