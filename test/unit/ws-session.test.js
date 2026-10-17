import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { WSSession } from '../../lib/client/ws-session.js';
import { CDPClient } from '../../lib/client/cdp-client.js';
import { Util } from '../../lib/utils/util.js';

class FakeSocket extends EventEmitter {
    readyState = 1;
    sent = [];

    send(raw, callback) {
        this.sent.push(JSON.parse(raw));
        callback();
    }

    terminate() {
        this.readyState = 3;
        this.emit('close');
    }

    reply(message) {
        this.emit('message', Buffer.from(JSON.stringify(message)));
    }
}

describe('WebSocket session lifecycle', () => {
    let ws;
    let session;
    beforeEach(() => {
        ws = new FakeSocket();
        session = new WSSession(ws, {
            timeout: 1000
        });
    });
    afterEach(() => session.detach());

    it('tracks a request before send and resolves a response arriving before the callback', async () => {
        ws.send = (raw, callback) => {
            const { id } = JSON.parse(raw);
            ws.reply({
                id,
                result: {
                    ok: true
                }
            });
            callback();
        };
        assert.deepEqual(await session.send('Runtime.enable'), {
            ok: true
        });
        assert.equal(session.requestCache.size, 0);
    });

    it('forwards events with params and sessionId', async () => {
        const event = once(session, 'Debugger.scriptParsed');
        ws.reply({
            method: 'Debugger.scriptParsed',
            params: {
                scriptId: '1'
            },
            sessionId: 'child'
        });
        assert.deepEqual(await event, [{
            scriptId: '1'
        }, 'child']);
    });

    it('rejects CDP protocol errors with command, code and data', async () => {
        const result = session.send('Invalid.command');
        const rejection = assert.rejects(result, (error) => {
            assert.match(error.message, /Invalid.command.*Unknown method/);
            assert.equal(error.code, -32601);
            assert.equal(error.data, 'details');
            return true;
        });
        ws.reply({
            id: 1,
            error: {
                message: 'Unknown method', code: -32601, data: 'details'
            }
        });
        await rejection;
        assert.equal(session.requestCache.size, 0);
    });

    it('rejects and removes send callback errors and synchronous send failures', async () => {
        ws.send = (raw, callback) => callback(new Error('send callback failed'));
        await assert.rejects(session.send('one'), /send callback failed/);
        ws.send = () => {
            throw new Error('send threw');
        };
        await assert.rejects(session.send('two'), /send threw/);
        assert.equal(session.requestCache.size, 0);
    });

    it('times out missing responses, ignores late replies and keeps the session usable', async () => {
        session.timeout = 30;
        await assert.rejects(session.send('missing'), {
            code: 'ETIMEDOUT'
        });
        assert.equal(session.requestCache.size, 0);
        ws.reply({
            id: 1, result: {}
        });
        const result = session.send('next');
        ws.reply({
            id: 2,
            result: {
                next: true
            }
        });
        assert.deepEqual(await result, {
            next: true
        });
    });

    it('supports explicitly disabling the request deadline', async () => {
        session.timeout = 0;
        const result = session.send('no deadline');
        assert.equal(session.requestCache.get(1).timer, null);
        ws.reply({
            id: 1, result: {}
        });
        await result;
    });

    ['close', 'error', 'detach', 'invalid JSON'].forEach((reason) => {
        it(`rejects all pending requests and cleans listeners on ${reason}`, async () => {
            const results = [session.send('first'), session.send('second')];
            const rejections = results.map((result) => assert.rejects(result));
            if (reason === 'close') {
                ws.terminate();
            } else if (reason === 'error') {
                ws.emit('error', new Error('socket failure'));
            } else if (reason === 'detach') {
                session.detach();
            } else {
                ws.emit('message', 'not JSON');
            }
            await Promise.all(rejections);
            assert.equal(session.requestCache.size, 0);
            assert.equal(session.ws, null);
            for (const name of ['message', 'error', 'close']) {
                assert.equal(ws.listenerCount(name), 0, name);
            }
            await assert.rejects(session.send('closed'), /closed websocket/);
        });
    });

    it('does not recreate pending requests when a send callback arrives after detach', async () => {
        let sent;
        ws.send = (raw, callback) => {
            sent = callback;
        };
        const result = assert.rejects(session.send('pending'));
        session.detach();
        sent();
        await result;
        assert.equal(session.requestCache.size, 0);
    });

    it('rejects non-object JSON messages and validates timeout options', async () => {
        const result = assert.rejects(session.send('pending'), /Invalid WebSocket JSON/);
        ws.emit('message', 'null');
        await result;
        assert.throws(() => new WSSession(new FakeSocket(), {
            timeout: -1
        }), RangeError);
    });
});

describe('CDP connection cleanup', function() {
    this.timeout(5000);
    let server;
    let originalLogError;
    let sockets;
    beforeEach(async () => {
        sockets = new Set();
        server = http.createServer();
        server.on('connection', (socket) => {
            sockets.add(socket);
            socket.on('close', () => sockets.delete(socket));
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        originalLogError = Util.logError;
        Util.logError = () => {};
    });
    afterEach(async () => {
        Util.logError = originalLogError;
        for (const socket of sockets) {
            socket.destroy();
        }
        await new Promise((resolve) => {
            server.close(resolve);
        });
    });

    it('destroys a stalled WebSocket handshake when its connection deadline expires', async () => {
        const closed = Promise.withResolvers();
        server.on('upgrade', (req, socket) => {
            socket.once('end', () => {
                closed.resolve();
                socket.end();
            });
            socket.resume();
        });
        const result = await CDPClient({
            url: `ws://127.0.0.1:${server.address().port}`, timeout: 200
        });
        assert.equal(typeof result, 'undefined');
        await closed.promise;
    });

    it('also applies the connection timeout to HTTP debugger discovery', async () => {
        server.on('request', () => {});
        const result = await CDPClient({
            host: '127.0.0.1', port: server.address().port, timeout: 50
        });
        assert.equal(typeof result, 'undefined');
    });

    it('passes configurable command timeouts to the built-in session', async () => {
        const wss = new WebSocketServer({
            server
        });
        const client = await CDPClient({
            url: `ws://127.0.0.1:${server.address().port}`, timeout: 1000, requestTimeout: 50
        });
        try {
            assert.ok(client);
            await assert.rejects(client.startJSCoverage(), {
                code: 'ETIMEDOUT'
            });
        } finally {
            await client?.close();
            await new Promise((resolve) => {
                wss.close(resolve);
            });
        }
    });
});
