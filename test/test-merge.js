const fs = require('fs');
const { Session } = require('inspector');
const { promisify } = require('util');
const { fileURLToPath } = require('url');
const { chromium } = require('playwright');

const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        'v8',
        ['html', {
            subdir: 'html'
        }]
    ],

    // merge from exists raw dirs
    inputDir: './docs/node-vm/raw, ./docs/cli/raw, ./wrong-raw-dir',

    name: 'My Merge Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    sourcePath: (filePath) => {
        const list = ['monocart-coverage-reports/', 'coverage-v8/'];
        for (const str of list) {
            if (filePath.startsWith(str)) {
                return filePath.slice(str.length);
            }
        }
        return filePath;
    },

    outputDir: './docs/merge',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};


// ==================================================================
// start node.js coverage
const startV8Coverage = async () => {
    const session = new Session();
    session.connect();

    const postSession = promisify(session.post.bind(session));

    await postSession('Profiler.enable');
    await postSession('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true
    });
    return postSession;
};

const takeV8Coverage = async (postSession) => {
    const { result } = await postSession('Profiler.takePreciseCoverage');
    return result;
};

const stopV8Coverage = async (postSession) => {
    await postSession('Profiler.stopPreciseCoverage');
    await postSession('Profiler.disable');
};

// ==================================================================

const collectV8Coverage = async (postSession) => {

    let coverageList = await takeV8Coverage(postSession);
    if (!coverageList) {
        return;
    }

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

    // console.log(coverageList);
    coverageList = coverageList.filter((entry) => entry.url.includes('test/mock/node'));

    // attach source content
    coverageList.forEach((item) => {
        const filePath = fileURLToPath(item.url);
        if (fs.existsSync(filePath)) {
            item.source = fs.readFileSync(filePath).toString('utf8');
        } else {
            EC.logRed('not found file', filePath);
        }
    });

    // console.log(coverageList);

    console.log('add node.js coverage ...');
    await MCR(coverageOptions).add(coverageList);


};

const testBrowser = async () => {

    const browser = await chromium.launch();

    const page = await browser.newPage();

    await page.coverage.startJSCoverage({
        // reportAnonymousScripts: true
    });

    const jsPath = './test/mock/v8/dist/coverage-v8.js';
    const content = fs.readFileSync(jsPath).toString('utf-8');

    await page.addScriptTag({
        content: `${content}\n//# sourceURL=test/mock/v8/dist/coverage-v8.js`
    });

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

    const coverageList = await page.coverage.stopJSCoverage();

    coverageList.forEach((entry) => {
        if (entry.url.endsWith('coverage-v8.js')) {
            entry.sourceMap = JSON.parse(fs.readFileSync(`${jsPath}.map`).toString('utf-8'));
        }
    });

    await MCR(coverageOptions).add(coverageList);

    await browser.close();
};

const testNode = async () => {
    // =====================================================
    const postSession = await startV8Coverage();

    // silent
    const log = console.log;
    console.log = () => {};

    // import lib after v8 coverage started
    // test dist with sourcemap
    const { component, branch } = require('./mock/node/dist/coverage-node.js');

    component(3);
    branch();

    console.log = log;

    await collectV8Coverage(postSession);

    await stopV8Coverage(postSession);
};


const generate = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    await Promise.all([
        testBrowser(),
        testNode()
    ]);

    console.log('generate merge coverage reports ...');
    const coverageResults = await MCR(coverageOptions).generate();
    console.log('merge coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
