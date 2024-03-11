const EC = require('eight-colors');
const { chromium } = require('playwright');

const MCR = require('../');
const CDPClient = MCR.CDPClient;

const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8'],

    name: 'My V8 Client Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/client',
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

    await client.startCoverage();

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

    const coverageData = await client.stopCoverage();

    await client.close();
    await browser.close();

    const coverageReport = MCR(coverageOptions);
    await coverageReport.add(coverageData);

    if (coverageReport.hasCache()) {
        const coverageResults = await coverageReport.generate();
        console.log('test client coverage reportPath', EC.magenta(coverageResults.reportPath));
    }

};

generate();
