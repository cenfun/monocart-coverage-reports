const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');

// v8 and lcov
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',
    name: 'My Css Coverage Report',
    assetsPath: '../assets',
    lcov: true,
    outputDir: './docs/css'
};

const test = async (serverUrl) => {

    console.log('start css test ...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.coverage.startCSSCoverage({
        resetOnNavigation: false
    });

    const fileList = [
        './test/mock/css/index.html',
        './test/mock/minify/with-map/bootstrap.min.css',
        './test/mock/css/style.css'
    ];
    for (const filePath of fileList) {
        const content = fs.readFileSync(filePath).toString('utf-8');
        const extname = path.extname(filePath);
        if (extname === '.html') {
            await page.setContent(content);
        } else if (extname === '.css') {
            await page.addStyleTag({
                content: `${content}\n/*# sourceURL=${filePath} */`
            });
        } else {
            await page.addScriptTag({
                content: `${content}\n//# sourceURL=${filePath}`
            });
        }
    }

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    const coverageData = await page.coverage.stopCSSCoverage();
    const report = await MCR(coverageOptions).add(coverageData);
    console.log('css coverage added', report.type);
    await browser.close();
};

const generate = async () => {

    console.log('generate css coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('css coverage reportPath', EC.magenta(coverageResults.reportPath));
};

const main = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test();

    await generate();
};

main();
