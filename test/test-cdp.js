const EC = require('eight-colors');
const { chromium } = require('playwright');

const MCR = require('../');
const CDPClient = MCR.CDPClient;

const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8'],

    name: 'My V8 CDP Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/cdp',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};


const generate = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    // =====================================================
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const session = await page.context().newCDPSession(page);
    const client = await CDPClient({
        session
    });

    await client.startJSCoverage();
    await client.startCSSCoverage();

    await page.setContent(`<html>
    <head>
        <title>mock page anonymous</title>
        <style>
            body { font-size: 16px; }
            h3 { display: block; }

            .unused {
                border: 1px solid #ccc;
            }
        </style>
    </head>
    <body>
        mock page anonymous
    </body>
    </html>`);

    const jsCoverage = await client.stopJSCoverage();
    const cssCoverage = await client.stopCSSCoverage();

    await client.close();
    await browser.close();

    const coverageReport = MCR(coverageOptions);

    const coverageList = [... jsCoverage, ... cssCoverage];
    await coverageReport.add(coverageList);

    if (coverageReport.hasCache()) {
        const coverageResults = await coverageReport.generate();
        console.log('test-node-cdp coverage reportPath', EC.magenta(coverageResults.reportPath));
    }

};

generate();
