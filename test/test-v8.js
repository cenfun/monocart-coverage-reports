const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');

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
        [path.resolve('./test/custom-istanbul-reporter.js'), {
            type: 'istanbul',
            file: 'custom-istanbul-coverage.text'
        }],
        [path.resolve('./test/custom-v8-reporter.js'), {
            type: 'v8',
            outputFile: 'custom-v8-coverage.json'
        }],
        [path.resolve('./test/custom-v8-reporter.mjs'), {
            type: 'both'
        }]
    ],

    name: 'My V8 Coverage Report',
    assetsPath: '../assets',
    lcov: true,

    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1 || sourcePath.search(/minify\//) !== -1,

    // v8Ignore: false,

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

    onEnd: (coverageResults) => {
        const thresholds = {
            bytes: 80,
            lines: 60
        };
        console.log('check thresholds ...', thresholds);
        const errors = [];
        const { summary } = coverageResults;
        Object.keys(thresholds).forEach((k) => {
            const pct = summary[k].pct;
            if (pct < thresholds[k]) {
                errors.push(`Coverage threshold for ${k} (${pct} %) not met: ${thresholds[k]} %`);
            }
        });
        if (errors.length) {
            const errMsg = errors.join('\n');
            console.log(EC.red(errMsg));
        }
    },

    outputDir: './docs/v8'
};

const test = async () => {

    console.log('start v8 test1 ...');
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

    await page.setContent(`<!DOCTYPE html>
    <html>
    <head>
        <title>coverage page</title>
    </head>
    <body>
        <h3 class="red inline-used and-used">Mock V8 Webpack Coverage</h3>
    </body>
    </html>`);

    const fileList = [
        './test/mock/v8/dist/coverage-v8.js',
        // './test/mock/minify/with-map/bootstrap.min.css',
        './test/mock/css/src/style.css'
    ];
    for (const filePath of fileList) {
        const content = fs.readFileSync(filePath).toString('utf-8');
        if (path.extname(filePath) === '.css') {
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

        dispatchEvent(new Event('load'));

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

    const coverageList = [... jsCoverage, ... cssCoverage];

    // v8
    const report = await MCR(coverageOptions).add(coverageList);

    console.log('v8 coverage1 added', report.type);

    await browser.close();
};

const generate = async () => {

    console.log('generate v8 coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('v8 coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test();

    await generate();
};

main();
