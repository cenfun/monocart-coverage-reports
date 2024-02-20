const fs = require('fs');
const { fileURLToPath } = require('url');
const CDP = require('chrome-remote-interface');
const EC = require('eight-colors');

const MCR = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',

    name: 'My V8 Node CDP Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/v8-node-cdp'
};

const collectV8Coverage = async (client) => {

    const data = await client.Profiler.takePreciseCoverage();
    let coverageList = data.result;

    if (!coverageList) {
        console.log('failed to take coverage data');
        return;
    }

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

    // console.log(coverageList);
    coverageList = coverageList.filter((entry) => entry.url.includes('test/mock/node'));

    if (!coverageList.length) {
        return;
    }

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

    console.log('add node.js cdp coverage ...');
    await MCR(coverageOptions).add(coverageList);

};


const generate = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    // =====================================================
    // after webServer is debugging on ws://127.0.0.1:9229
    // connect to the server with Chrome Devtools Protocol

    const client = await CDP({
        port: 9229
    });

    client.on('error', (err) => {
        console.log(err);
    });

    await client.Profiler.enable();

    await client.Profiler.startPreciseCoverage({
        callCount: true,
        detailed: true
    });

    // =====================================================

    // silent
    const log = console.log;
    console.log = () => {};

    // import lib after v8 coverage started
    // test lib app
    const {
        foo, bar, app
    } = require('./mock/node/lib/app.js');
    // test dist with sourcemap
    const { component, branch } = require('./mock/node/dist/coverage-node.js');

    foo();
    bar();
    app();
    await collectV8Coverage(client);


    component();
    branch();
    await collectV8Coverage(client);

    console.log = log;

    await client.Profiler.disable();
    await client.close();

    // =====================================================

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('test-node-cdp coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
