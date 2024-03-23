const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const assert = require('assert');
const axios = require('axios');
const EC = require('eight-colors');

const MCR = require('../');
const CDPClient = MCR.CDPClient;

const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8', 'v8-json'],

    name: 'My Koa Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    entryFilter: {
        '**/test/**': true
    },

    outputDir: './docs/node-koa',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};

// ==================================================================

// mock start koa server
const startKoaProcess = (port) => {
    console.log('start koa server ...');
    const cp = spawn(`node --inspect=${port} ./test/mock/node/lib/koa.js`, {
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
    console.log('kill koa server ...');

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

    const port = 9280;

    const cp = await startKoaProcess(port);
    if (!cp) {
        return;
    }

    // request koa server
    const response = await axios.get('http://localhost:3080');
    assert(response.data === 'Hello World');

    // after webServer is debugging on ws://127.0.0.1:9229
    // connect to the server with Chrome Devtools Protocol
    const client = await CDPClient({
        port
    });

    const v8Dir = await client.writeCoverage();
    // console.log('v8 dir', v8Dir);

    // close debugger
    await client.close();
    killSubProcess(cp);

    // check coverage dir
    assert(path.resolve(dir) === v8Dir);

    const coverageReport = MCR(coverageOptions);
    // clean previous cache first
    coverageReport.cleanCache();

    await coverageReport.addFromDir(dir);
    const coverageResults = await coverageReport.generate();
    console.log('test-node-koa coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
