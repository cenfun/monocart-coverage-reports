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
        ['console-details', {
            // skipPercent: 100,
            metrics: ['bytes', 'lines'],
            maxCols: 30
        }],
        ['v8', {
            // metrics: ['bytes', 'functions', 'lines']
        }],
        'v8-json',
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

    outputDir: './docs/v8',

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


        // debug diff json

        // const json1 = JSON.parse(fs.readFileSync('./docs/istanbul/coverage-final.json').toString('utf-8'));
        // const json2 = JSON.parse(fs.readFileSync('./docs/v8/coverage-final.json').toString('utf-8'));

        // const data1 = json1[Object.keys(json1).find((it) => it.endsWith('logical.js'))];
        // const data2 = json2[Object.keys(json2).find((it) => it.endsWith('logical.js'))];

        // fs.writeFileSync('./docs/v8/branch1.json', JSON.stringify(data1, null, 4));
        // fs.writeFileSync('./docs/v8/branch2.json', JSON.stringify(data2, null, 4));
    }
};

const test = async () => {

    console.log('start v8 test ...');
    const browser = await chromium.launch({
        //  headless: false
    });
    const page = await browser.newPage();

    // page.on('console', async (msg) => {
    //     for (const arg of msg.args()) {
    //         console.log(await arg.jsonValue());
    //     }
    // });

    await Promise.all([
        page.coverage.startJSCoverage({
            resetOnNavigation: false
        }),
        page.coverage.startCSSCoverage({
            resetOnNavigation: false
        })
    ]);

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

    const coverageList = [... jsCoverage, ... cssCoverage];

    // v8
    const report = await MCR(coverageOptions).add(coverageList);

    console.log('v8 coverage added', report.type);

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
