const { chromium } = require('playwright');
const EC = require('eight-colors');

const MCR = require('../');

// v8 and istanbul reports
const multipleReportsOptions = {
    // logging: 'debug',

    // https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib
    reports: [
        // ['console-summary'],
        ['v8'],
        ['v8-json', {
            // outputFile: 'json/v8-report.json'
        }],
        ['html', {
            subdir: 'istanbul'
        }],
        ['json', {
            file: 'my-json-file.json'
        }],
        'lcovonly'
    ],

    name: 'My V8 and Istanbul Coverage Report',
    // v8 sub dir
    outputFile: 'v8/index.html',
    assetsPath: '../../assets',

    // reportPath: 'lcov.info',
    reportPath: () => {
        return 'my-json-file.json';
    },

    entryFilter: (entry) => {
        return entry.url.includes('v8/');
    },

    sourceFilter: (filePath) => {
        return filePath.includes('src/');
    },

    sourcePath: (filePath) => {
        const list = ['coverage-v8/'];
        for (const str of list) {
            if (filePath.startsWith(str)) {
                return filePath.slice(str.length);
            }
        }
        return filePath;
    },

    onEnd: (coverageResults) => {
        const summary = coverageResults.summary;
        console.log('onEnd Bytes:', `${summary.bytes.pct} %`);
    },

    outputDir: './docs/v8-and-istanbul'
};

const test = async (serverUrl) => {

    console.log('start v8-and-istanbul test ...');
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

    const coverageList = [... jsCoverage, ... cssCoverage];

    // to istanbul
    const report = await MCR(multipleReportsOptions).add(coverageList);

    console.log('v8-and-istanbul coverage added', report.type);

    await browser.close();
};

const generate = async () => {

    console.log('generate v8-and-istanbul coverage reports ...');
    // to istanbul
    const coverageResults2 = await MCR(multipleReportsOptions).generate();
    console.log('reportPath', EC.magenta(coverageResults2.reportPath));
};


module.exports = async (serverUrl) => {
    // clean cache first
    await MCR(multipleReportsOptions).cleanCache();

    await test(serverUrl);

    await generate();
};
