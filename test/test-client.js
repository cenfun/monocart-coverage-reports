const EC = require('eight-colors');
const { chromium } = require('playwright');
const puppeteer = require('puppeteer');

const MCR = require('../');

const checkSnapshot = require('./check-snapshot.js');

const coverageOptions = {
    // logging: 'debug',

    name: 'My V8 Client Coverage Report',

    // watermarks: [60, 90],
    reports: [

        // ['console-details', {
        //     maxCols: 20
        // }],

        'v8'
    ],

    assetsPath: '../assets',
    // lcov: true,

    entryFilter: (entry) => {
        if (entry.url && entry.url.includes('src')) {
            return true;
        }
    },

    outputDir: './docs/client',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const getPageHtml = (key) => {
    return `<html>
<head>
<title>mock ${key} anonymous</title>
<style>
body { font-size: 16px; }
h3 { display: block; }
.unused {
    border: 1px solid #ccc;
}
.uncovered {
    color: red;
}
.${key} {
    color: green;
}
/*# sourceURL=src/${key}.css*/
</style>
</head>
<body>
<h3>mock page anonymous</h3>
<div class="${key}">${key}<div>
<script>
const sourceURL = "${key}";
const uncovered = () => {
    console.log("uncovered");
};
//# sourceURL=src/${key}.js
</script>
</body>
</html>`;
};

const testPlaywright = async (coverageReport) => {
    // =====================================================
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const session = await page.context().newCDPSession(page);
    const client = await MCR.CDPClient({
        session
    });

    await client.startCoverage();

    await page.setContent(getPageHtml('playwright'));

    const coverageData = await client.stopCoverage();

    await client.close();
    await browser.close();

    await coverageReport.add(coverageData);
};

const testPuppeteer = async (coverageReport) => {
    const browser = await puppeteer.launch({
        // headless: false,
        args: ['--no-sandbox']
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
    const client = await MCR.CDPClient({
        session
    });

    await client.startCoverage();

    await page.setContent(getPageHtml('puppeteer'));

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
