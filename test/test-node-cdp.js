const fs = require('fs');
const WebSocket = require('ws');
const axios = require('axios');
const { fileURLToPath } = require('url');

const EC = require('eight-colors');

const CoverageReport = require('../');


const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',

    name: 'My V8 Node CDP Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/v8-node-cdp'
};


function send(ws, command) {
    return new Promise((resolve) => {

        const callback = function(text) {
            const response = JSON.parse(text);
            if (response.id === command.id) {
                ws.removeListener('message', callback);
                resolve(response);
            }
        };

        ws.on('message', callback);
        ws.send(JSON.stringify(command));

    });
}

// ==================================================================
// start node.js coverage
const startV8Coverage = async () => {
    // after webServer is debugging on ws://127.0.0.1:9229
    // connect to the server with Chrome Devtools Protocol
    const res = await axios.get('http://127.0.0.1:9229/json');
    // using first one debugger process
    const webSocketDebuggerUrl = res.data[0].webSocketDebuggerUrl;
    const ws = new WebSocket(webSocketDebuggerUrl);

    await new Promise((resolve) => {
        ws.once('open', resolve);
    });
    console.log(EC.magenta('webSocketDebuggerUrl'), EC.cyan(webSocketDebuggerUrl), EC.green('connected!'));

    // enable and start v8 coverage
    await send(ws, {
        id: 1,
        method: 'Profiler.enable'
    });

    await send(ws, {
        id: 2,
        method: 'Profiler.startPreciseCoverage',
        params: {
            callCount: true,
            detailed: true
        }
    });


    return ws;
};

const takeV8Coverage = async (ws) => {
    const data = await send(ws, {
        id: 3,
        method: 'Profiler.takePreciseCoverage'
    });
    return data.result.result;
};
// ==================================================================

const collectV8Coverage = async (ws) => {

    let coverageList = await takeV8Coverage(ws);
    if (!coverageList) {
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
    await new CoverageReport(coverageOptions).add(coverageList);


};


const generate = async () => {
    // clean cache first
    await new CoverageReport(coverageOptions).cleanCache();

    // =====================================================
    const ws = await startV8Coverage();

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
    await collectV8Coverage(ws);


    component();
    branch();
    await collectV8Coverage(ws);

    // =====================================================

    console.log('generate v8-node cdp coverage reports ...');

    const coverageResults = await new CoverageReport(coverageOptions).generate();
    console.log('v8-node cdp coverage reportPath', EC.magenta(coverageResults.reportPath));

    ws.close();
};

generate();
