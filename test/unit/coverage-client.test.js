import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { CoverageClient } from '../../lib/client/coverage-client.js';
import { WSSession } from '../../lib/client/ws-session.js';
import { Util } from '../../lib/utils/util.js';

const tick = () => new Promise((resolve) => {
    setImmediate(resolve);
});

class FakeSocket extends EventEmitter {
    readyState = 1;
    pending = [];

    send(raw, callback) {
        const request = JSON.parse(raw);
        callback();
        if (['Debugger.getScriptSource', 'CSS.getStyleSheetText', 'Debugger.resume'].includes(request.method)) {
            this.pending.push(request);
            return;
        }
        this.reply({
            id: request.id,
            result: {
                result: [], ruleUsage: []
            }
        });
    }

    reply(message) {
        this.emit('message', JSON.stringify(message));
    }

    terminate() {
        this.readyState = 3;
        this.emit('close');
    }
}

const emitBackgroundEvents = (ws) => {
    ws.reply({
        method: 'Debugger.scriptParsed',
        params: {
            scriptId: '1'
        }
    });
    ws.reply({
        method: 'CSS.styleSheetAdded',
        params: {
            header: {
                styleSheetId: '1', sourceURL: 'style.css'
            }
        }
    });
    ws.reply({
        method: 'Debugger.paused', params: {}
    });
};

// The child process makes unexpected background rejections fatal even if the
// test runner installs its own unhandledRejection listener.
describe('CoverageClient best-effort requests', function() {
    this.timeout(10000);
    let originalLogDebug;
    let logs;

    beforeEach(() => {
        originalLogDebug = Util.logDebug;
        logs = [];
        Util.logDebug = (message) => logs.push(message);
    });
    afterEach(() => {
        Util.logDebug = originalLogDebug;
    });

    it('preserves successful results and converts synchronous and async failures to null', async () => {
        const result = {
            scriptSource: 'const answer = 42;'
        };
        const client = new CoverageClient({
            send: () => Promise.resolve(result)
        });
        assert.equal(await client.safeSend('success'), result);
        client.session.send = () => {
            throw new Error('sync failure');
        };
        assert.equal(await client.safeSend('sync'), null);
        client.session.send = () => Promise.reject(new Error('async failure'));
        assert.equal(await client.safeSend('async'), null);
        client.session.send = () => Promise.reject(null);
        assert.equal(await client.safeSend('non-error'), null);
        assert.deepEqual(logs, ['sync: sync failure', 'async: async failure', 'non-error: null']);
    });

    ['protocol error', 'timeout', 'disconnect', 'detach'].forEach((reason) => {
        it(`handles background ${reason} without disabling a usable session`, async () => {
            const ws = new FakeSocket();
            const session = new WSSession(ws, {
                timeout: 20
            });
            const client = new CoverageClient(session);
            try {
                await client.startCoverage();
                emitBackgroundEvents(ws);
                assert.equal(ws.pending.length, 3);
                if (reason === 'protocol error') {
                    for (const { id } of ws.pending) {
                        ws.reply({
                            id,
                            error: {
                                code: -32000, message: 'Resource is gone'
                            }
                        });
                    }
                } else if (reason === 'timeout') {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 50);
                    });
                } else if (reason === 'disconnect') {
                    ws.terminate();
                } else {
                    await client.close();
                }
                await tick();
                assert.equal(client.scriptSources.size, 0);
                assert.equal(client.styleEntries.size, 0);
                assert.equal(logs.length, 3);
                assert.ok(logs.some((message) => message.startsWith('Debugger.resume:')));
                if (['protocol error', 'timeout'].includes(reason)) {
                    // A resource failure must not make the connection unusable.
                    emitBackgroundEvents(ws);
                    for (const { id } of ws.pending.slice(3)) {
                        ws.reply({
                            id,
                            result: {
                                text: 'body {}', scriptSource: 'answer();'
                            }
                        });
                    }
                    await tick();
                    assert.equal(client.scriptSources.get('1'), 'answer();');
                    assert.equal(client.styleEntries.get('1').text, 'body {}');
                    assert.deepEqual(await client.stopCoverage(), [{
                        url: 'style.css', text: 'body {}', ranges: []
                    }]);
                } else if (reason === 'disconnect') {
                    await assert.rejects(client.stopCoverage(), /closed websocket/);
                }
            } finally {
                await client.close();
            }
        });
    });

    it('continues to propagate failures of critical commands', async () => {
        const session = new EventEmitter();
        session.send = () => Promise.reject(new Error('Critical command failed'));
        const client = new CoverageClient(session);
        await assert.rejects(client.startJSCoverage(), /Critical command failed/);
        await assert.rejects(client.startCSSCoverage(), /Critical command failed/);
        await assert.rejects(client.stopJSCoverage(), /Critical command failed/);
        await assert.rejects(client.stopCSSCoverage(), /Critical command failed/);
        await assert.rejects(client.writeCoverage(), /Critical command failed/);
        assert.deepEqual(logs, []);
    });

    it('has no unhandled rejection under Node strict rejection handling', () => {
        const result = spawnSync(process.execPath, ['--unhandled-rejections=strict', '--input-type=module', '-e', `
            import { EventEmitter } from 'node:events';
            import { CoverageClient } from ${JSON.stringify(import.meta.resolve('../../lib/client/coverage-client.js'))};
            import { WSSession } from ${JSON.stringify(import.meta.resolve('../../lib/client/ws-session.js'))};
            ${FakeSocket.toString()}
            const emitBackgroundEvents = ${emitBackgroundEvents.toString()};
            for (const detach of [false, true]) {
                const ws = new FakeSocket();
                const client = new CoverageClient(new WSSession(ws));
                await client.startCoverage();
                emitBackgroundEvents(ws);
                if (!detach) {
                    for (const { id } of ws.pending) ws.reply({ id, error: { code: -32000, message: 'gone' } });
                }
                await client.close();
                await new Promise((resolve) => setImmediate(resolve));
            }
        `], {
            encoding: 'utf8', timeout: 5000
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
    });
});
