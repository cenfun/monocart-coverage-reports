const fs = require('fs');
const path = require('path');
const {
    execSync, spawn, spawnSync
} = require('child_process');
const assert = require('assert');
const EC = require('eight-colors');

const Util = require('../lib/utils/util.js');

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
            }, 1000);
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

    // On Linux
    const ps = spawnSync('ps', ['-A', '-o', 'ppid,pid']);
    const out = ps.stdout.toString();
    // console.log(out);
    const list = out.trim().split(/\n/).map((line) => line.trim().split(/\s+/).map((s) => parseInt(s)));
    // console.log(list)
    const getSubs = (ls, id) => {
        const subs = [];
        ls.forEach((arr) => {
            if (arr[0] === id) {
                subs.push(arr[1]);
            }
        });
        if (subs.length) {
            [].concat(subs).forEach((sid) => {
                subs.push(getSubs(ls, sid));
            });
        }
        return subs.flat();
    };

    // In case of POSIX and `SIGINT` signal, send it to the main process group only.
    // console.log("pid", cp.pid)
    const subs = getSubs(list, cp.pid);
    const ids = subs.concat(cp.pid);
    // console.log("ids", ids);

    try {
        ids.forEach((id) => {
            process.kill(id, 'SIGKILL');
        });
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
        EC.logRed('can not start koa process');
        process.exit(1);
        return;
    }

    // request koa server
    const url = 'http://localhost:3080';
    const [err, res] = await Util.request(url);
    if (err) {
        EC.logRed(`failed to request koa url: ${url}`);
        console.log(err);
        killSubProcess(cp);
        process.exit(1);
        return;
    }

    assert(res.data === 'Hello World');

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
