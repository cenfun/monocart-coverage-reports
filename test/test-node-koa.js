const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { execSync, spawn } = require('child_process');
const assert = require('assert');

const WebSocket = require('ws');
const axios = require('axios');
const EC = require('eight-colors');

const MCR = require('../');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',

    name: 'My Koa Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/v8-node-koa'
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

// mock start koa server
const startSubProcess = (dir) => {
    const cp = spawn('node --inspect=9229 ./test/koa.js', {
        stdio: 'inherit',
        shell: true
    });
    return new Promise((resolve) => {
        cp.on('error', (err) => {
            console.log('sub process error', err);
            resolve();
        });
        cp.on('spawn', () => {
            // wait for sub process ready
            setTimeout(() => {
                resolve(cp);
            }, 500);
        });
    });
};

const killSubProcess = (cp) => {

    // On Windows, we always call `taskkill` no matter signal.
    if (process.platform === 'win32') {
        try {
            execSync(`taskkill /pid ${cp.pid} /T /F /FI "MEMUSAGE gt 0"`, {
                stdio: 'ignore'
            });
        } catch (e) {
        // the process might have already stopped
        }
        return;
    }

    // In case of POSIX and `SIGINT` signal, send it to the main process group only.
    try {
        process.kill(cp.pid, 'SIGKILL');
    } catch (e) {
        // the process might have already stopped
    }
};

const generate = async () => {

    // start server in sub process

    // cross-env NODE_V8_COVERAGE=.temp/v8-coverage-koa node --inspect=9229 ./test/koa.js

    const dir = '.temp/v8-coverage-koa';

    process.env.NODE_V8_COVERAGE = dir;

    // clean previous coverage data cache
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, {
            recursive: true,
            force: true
        });
    }

    const cp = await startSubProcess(dir);
    if (!cp) {
        return;
    }

    // request koa server
    const response = await axios.get('http://localhost:3000');
    assert(response.data === 'Hello World');

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
        method: 'Runtime.enable'
    });

    //  write the coverage started by NODE_V8_COVERAGE to disk on demand
    const data = await send(ws, {
        id: 2,
        method: 'Runtime.evaluate',
        params: {
            expression: `new Promise(resolve=>{
                require("v8").takeCoverage();
                resolve(process.env.NODE_V8_COVERAGE);
            })`,
            includeCommandLineAPI: true,
            returnByValue: true,
            awaitPromise: true
        }
    });

    await send(ws, {
        id: 3,
        method: 'Runtime.disable'
    });

    // close debugger
    ws.close();

    // check coverage dir
    assert(path.resolve(dir) === data.result.result.value);

    const coverageReport = MCR(coverageOptions);
    // clean previous cache first
    coverageReport.cleanCache();

    const files = fs.readdirSync(dir);
    for (const filename of files) {
        const content = fs.readFileSync(path.resolve(dir, filename)).toString('utf-8');
        const json = JSON.parse(content);
        let coverageList = json.result;

        // filter node internal files
        coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

        coverageList = coverageList.filter((entry) => entry.url.includes('test/'));

        if (!coverageList.length) {
            continue;
        }

        console.log(coverageList.map((entry) => entry.url));

        // attached source content
        coverageList.forEach((entry) => {
            entry.source = fs.readFileSync(fileURLToPath(entry.url)).toString('utf8');
        });

        await coverageReport.add(coverageList);
    }

    const coverageResults = await coverageReport.generate();
    console.log('koa coverage reportPath', EC.magenta(coverageResults.reportPath));

    console.log('kill koa server ...');
    killSubProcess(cp);

    // console.log(cp.killed);

};

generate();
