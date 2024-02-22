const fs = require('fs');
const path = require('path');
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
        }],
        'v8-json'
    ],

    name: 'My Puppeteer Coverage Report',
    assetsPath: '../assets',
    lcov: true,

    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1 || sourcePath.search(/minify\//) !== -1,

    sourcePath: (filePath) => {
        const map = {
            'localhost-8130/': 'test/mock/',
            'coverage-v8/': ''
        };
        for (const key in map) {
            if (filePath.startsWith(key)) {
                return map[key] + filePath.slice(key.length);
            }
        }
        return filePath;
    },

    outputDir: './docs/puppeteer'
};

const test = async () => {

    console.log('start puppeteer test ...');

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

    const fileList = [
        './test/mock/v8/index.html',
        './test/mock/v8/dist/coverage-v8.js',
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

    console.log('puppeteer coverage added', report.type);

    await browser.close();
};


const generate = async () => {

    console.log('generate puppeteer coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('puppeteer coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test();

    await generate();
};

main();
