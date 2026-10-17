import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { request } from '../../lib/utils/request.js';

// No external network: each test owns its listener and destroys remaining sockets.
describe('HTTP request lifecycle', () => {
    let server;
    let url;
    let handler;
    beforeEach(async () => {
        server = http.createServer((req, res) => handler(req, res));
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        url = `http://127.0.0.1:${server.address().port}`;
    });
    afterEach(async () => {
        server.closeAllConnections();
        await new Promise((resolve) => {
            server.close(resolve);
        });
    });

    it('preserves HTTP options, IncomingMessage metadata and JSON response parsing', async () => {
        handler = (req, res) => {
            assert.equal(req.headers['x-test'], 'yes');
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end('{"ok":true}');
        };
        const [error, res] = await request(url, {
            headers: {
                'x-test': 'yes'
            }
        });
        assert.ifError(error);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.data, {
            ok: true
        });
    });

    it('returns text unchanged and preserves the response on invalid JSON', async () => {
        handler = (req, res) => res.end('text');
        const [error, res] = await request(url);
        assert.ifError(error);
        assert.equal(res.data, 'text');
        handler = (req, response) => {
            response.setHeader('content-type', 'application/json');
            response.end('invalid JSON');
        };
        const [parseError, invalid] = await request(url);
        assert.ok(parseError instanceof SyntaxError);
        assert.equal(invalid.data, 'invalid JSON');
    });

    it('does not retry HTTP errors or parsing failures on localhost', async () => {
        let calls = 0;
        handler = (req, res) => {
            calls++;
            res.writeHead(404);
            res.end('missing');
        };
        const localhost = url.replace('127.0.0.1', 'localhost');
        const [error] = await request(localhost);
        assert.match(error.message, /404/);
        assert.equal(calls, 1);
        handler = (req, res) => {
            calls++;
            res.setHeader('content-type', 'application/json');
            res.end('{');
        };
        const [parseError] = await request(localhost);
        assert.ok(parseError instanceof SyntaxError);
        assert.equal(calls, 2);
    });

    it('retains the IPv4 fallback for localhost connection refusal', async () => {
        handler = (req, res) => res.end('IPv4 server');
        const [error, res] = await request(url.replace('127.0.0.1', 'localhost'), {
            autoSelectFamily: false,
            lookup: (hostname, options, callback) => callback(null, '::1', 6)
        });
        assert.ifError(error);
        assert.equal(res.data, 'IPv4 server');
    });

    it('enforces a deadline while waiting for headers', async () => {
        handler = () => {};
        const [error] = await request(url, {
            timeout: 50
        });
        assert.equal(error.code, 'ETIMEDOUT');
    });

    it('enforces a total deadline after headers have arrived', async () => {
        handler = (req, res) => {
            res.writeHead(200);
            res.write('partial body');
        };
        const [error] = await request(url, {
            timeout: 50
        });
        assert.equal(error.code, 'ETIMEDOUT');
    });

    it('returns an error if the response terminates midway', async () => {
        handler = (req, res) => {
            res.writeHead(200, {
                'content-length': 1000
            });
            res.write('partial');
            setImmediate(() => res.destroy());
        };
        const [error] = await request(url, {
            timeout: 1000
        });
        assert.ok(error);
        assert.notEqual(error.code, 'ETIMEDOUT');
    });

    it('supports aborting before headers and during body transfer', async () => {
        handler = () => {};
        const [before] = await request(url, {
            signal: AbortSignal.abort()
        });
        assert.equal(before.name, 'AbortError');
        const controller = new AbortController();
        handler = (req, res) => {
            res.writeHead(200);
            res.write('partial');
            controller.abort();
        };
        const [during] = await request(url, {
            signal: controller.signal
        });
        assert.equal(during.name, 'AbortError');
    });

    it('accepts a disabled deadline and reports invalid URL, protocol and options as tuples', async () => {
        handler = (req, res) => res.end('ok');
        const [error, res] = await request(url, {
            timeout: 0
        });
        assert.ifError(error);
        assert.equal(res.data, 'ok');
        for (const input of ['not a URL', 'file:///tmp/coverage.json']) {
            const [invalid] = await request(input);
            assert.ok(invalid instanceof Error);
        }
        for (const timeout of [-1, Infinity, NaN]) {
            const [invalid] = await request(url, {
                timeout
            });
            assert.ok(invalid instanceof RangeError);
        }
    });
});
