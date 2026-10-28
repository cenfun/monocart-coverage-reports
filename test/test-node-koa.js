import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert';
import EC from 'eight-colors';

import { Util } from '../lib/utils/util.js';

import { MCR } from '../lib/index.js';
const CDPClient = MCR.CDPClient;

import checkSnapshot from './check-snapshot.js';
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8'],

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
const startKoaProcess = (inspectPort, serverPort) => {
    console.log('start koa server ...');
    const cp = spawn(process.execPath, [`--inspect=${inspectPort}`, './test/mock/node/lib/koa.js'], {
        stdio: 'inherit',
        shell: false
    });

    return new Promise((resolve) => {
        const timeout = 10000;
        const startTime = Date.now();
        let settled = false;

        const finish = (result) => {
            if (settled) {
                return;
            }
            settled = true;
            resolve(result);
        };

        const waitForServer = () => {
            if (settled) {
                return;
            }

            const socket = net.createConnection({
                host: '127.0.0.1',
                port: serverPort
            });

            socket.once('connect', () => {
                socket.destroy();
                finish(cp);
            });

            socket.once('error', () => {
                socket.destroy();
                if (Date.now() - startTime >= timeout) {
                    console.log(`timeout waiting for koa server on port ${serverPort}`);
                    finish();
                    return;
                }
                setTimeout(waitForServer, 100);
            });
        };

        cp.once('error', (err) => {
            console.log('sub process error', err);
            finish();
        });

        cp.once('exit', (code) => {
            if (!settled) {
                console.log(`koa process exited before ready, code: ${code}`);
                finish();
            }
        });

        cp.once('spawn', waitForServer);
    });
};

const killSubProcess = async (cp) => {
    console.log('kill koa server ...');

    if (process.platform === 'win32') {
        if (cp.exitCode !== null || cp.signalCode !== null) {
            return;
        }

        // This fixture has no descendants, so avoid taskkill's slow process queries.
        await new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timer);
                cp.off('exit', onExit);
                cp.off('error', onError);
            };
            const onExit = () => {
                cleanup();
                resolve();
            };
            const onError = (err) => {
                cleanup();
                reject(err);
            };
            const timer = setTimeout(() => {
                onError(new Error(`Timed out terminating Koa process ${cp.pid}`));
            }, 5000);

            cp.once('exit', onExit);
            cp.once('error', onError);
            try {
                if (!cp.kill('SIGKILL')) {
                    onError(new Error(`Failed to terminate Koa process ${cp.pid}`));
                }
            } catch (err) {
                onError(err);
            }
        });
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
    const serverPort = 3080;

    const cp = await startKoaProcess(port, serverPort);
    if (!cp) {
        EC.logRed('can not start koa process');
        process.exit(1);
        return;
    }

    // request koa server
    const url = `http://localhost:${serverPort}`;
    const [err, res] = await Util.request(url);
    if (err) {
        EC.logRed(`failed to request koa url: ${url}`);
        console.log(err);
        await killSubProcess(cp);
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
    await killSubProcess(cp);

    if (process.platform === 'win32') {
        assert(cp.exitCode !== null || cp.signalCode !== null, 'Koa process must exit before generating coverage');
    }

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
