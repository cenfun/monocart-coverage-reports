const EC = require('eight-colors');

const MCR = require('../');
const CDPClient = MCR.CDPClient;

const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8', 'v8-json'],

    name: 'My V8 Node cdp Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/node-cdp',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

const addV8Coverage = async (coverageReport, coverageList) => {

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

    console.log('add node.js cdp coverage ...', coverageList.length);
    await coverageReport.add(coverageList);
};


const generate = async () => {
    // clean cache first
    const coverageReport = MCR(coverageOptions);
    coverageReport.cleanCache();

    // =====================================================
    // after webServer is debugging on ws://127.0.0.1:9229
    // connect to the server with Chrome Devtools Protocol

    const client = await CDPClient({
        port: 9229
    });

    await client.startJSCoverage();

    // =====================================================
    require('./specs/node.test.js');
    // =====================================================

    const coverageList = await client.stopJSCoverage();
    // console.log('check source', coverageList.filter((it) => !it.source).map((it) => [it.scriptId, it.url]));
    // console.log(coverageList.map((it) => it.url));

    await addV8Coverage(coverageReport, coverageList);

    // await client.Profiler.disable();
    await client.close();

    const coverageResults = await coverageReport.generate();
    console.log('test-node-cdp coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
