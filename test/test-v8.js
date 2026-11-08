import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import EC from 'eight-colors';

import { MCR } from '../lib/index.js';
import checkSnapshot from './check-snapshot.js';

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
        ['markdown-summary', {
            // color: 'html'
        }],
        ['markdown-details', {
            // color: 'Tex',
            baseUrl: 'https://cenfun.github.io/monocart-coverage-reports/v8/#page=',
            metrics: ['bytes', 'lines']
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

    // inline: true,

    outputDir: './docs/v8',

    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1 || sourcePath.search(/minify\//) !== -1,

    // v8Ignore: false,

    sourcePath: (filePath, info) => {
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

    all: 'test/mock/src',

    sourceMapResolver: (url, defaultResolver) => {

        console.log('sourceMapResolver', url);

        return defaultResolver(url);
    },

    onEnd: (coverageResults) => {
        // Issue #142: the script ran, but Config was never instantiated.
        const fields = coverageResults.files.find((file) => file.sourcePath === 'test/mock/src/class-fields.js');
        assert.ok(fields, 'class field fixture is included in the V8 report');
        assert.equal(fields.summary.branches.total, 4);
        assert.equal(fields.summary.branches.covered, 0);

        const lcov = fs.readFileSync(path.join(coverageOptions.outputDir, 'lcov.info'), 'utf8');
        const record = lcov.split('end_of_record').find((item) => item.replace(/\\/g, '/').includes('SF:test/mock/src/class-fields.js\n'));
        assert.ok(record, 'class field fixture is included in LCOV');
        assert.match(record, /^BRF:4$/m);
        assert.match(record, /^BRH:0$/m);
        assert.deepEqual(record.match(/^BRDA:.*$/gm), [
            'BRDA:4,0,0,0', 'BRDA:4,0,1,0', 'BRDA:5,1,0,0', 'BRDA:5,1,1,0'
        ]);

        checkSnapshot(coverageResults);
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

    assert.equal(await page.evaluate(() => typeof window['coverage-v8'].Config), 'function');

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
    // console.log('v8 coverageResults', Object.keys(coverageResults));
    console.log('v8 coverage reportPath', EC.magenta(coverageResults.reportPath));
};


const main = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await test();

    await generate();
};

main();
