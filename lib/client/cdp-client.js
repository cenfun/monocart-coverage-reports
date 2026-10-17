
import EC from 'eight-colors';

import { Util } from '../utils/util.js';

import { WSSession } from './ws-session.js';
import { CoverageClient } from './coverage-client.js';

const getDebuggerUrl = async (options) => {

    const protocol = options.secure ? 'https' : 'http';

    const url = `${protocol}://${options.host}:${options.port}/json/list`;
    const [err, res] = await Util.request(url, {
        timeout: options.timeout
    });
    if (err) {
        return [err];
    }

    const targets = res.data;
    if (!Util.isList(targets)) {
        return [new Error(`Invalid response data: ${url}`)];
    }

    // console.log(targets);
    const target = options.target(targets);
    if (!target) {
        return [new Error(`Not found target: ${url}`)];
    }

    return [null, target.webSocketDebuggerUrl];
};

const getCDPUrl = async (options) => {
    if (options.url) {
        return [null, options.url];
    }

    // get debugger url
    const [err, debuggerUrl] = await getDebuggerUrl(options);
    if (err) {
        return [err];
    }

    return [null, debuggerUrl];

};

const connectWebSocket = (WebSocket, url, options) => new Promise((resolve) => {
    let ws;
    try {
        Util.logDebug(`Connect to ${url}`);
        ws = new WebSocket(url, [], {
            maxPayload: 256 * 1024 * 1024,
            perMessageDeflate: false,
            followRedirects: true,
            ... options.ws
        });
    } catch (error) {
        resolve([error]);
        return;
    }
    let settled = false;
    let timer;
    const cleanup = () => {
        clearTimeout(timer);
        ws.off('open', onOpen);
        ws.off('error', onError);
        ws.off('close', onClose);
    };
    const fail = (error) => {
        if (settled) {
            return;
        }
        settled = true;
        clearTimeout(timer);
        ws.off('open', onOpen);
        resolve([error]);
        // Keep error/close handlers through termination of a pending handshake.
        if (ws.readyState !== 3) {
            ws.terminate();
        }
    };
    const onError = (error) => fail(error);
    const onClose = () => {
        fail(new Error(`Connection closed before opening: ${url}`));
        cleanup();
    };
    const onOpen = () => {
        const session = new WSSession(ws, {
            timeout: options.requestTimeout
        });
        settled = true;
        cleanup();
        Util.logDebug(`${EC.green('Connected')} ${url}`);
        resolve([null, session]);
    };
    ws.on('error', onError);
    ws.once('close', onClose);
    ws.once('open', onOpen);
    if (options.timeout > 0) {
        timer = setTimeout(() => fail(new Error(`Timeout to connect: ${url}`)), options.timeout);
    }
});

const getCDPSession = async (options) => {
    if (options.session) {
        return [null, options.session];
    }
    for (const key of ['timeout', 'requestTimeout']) {
        if (!Number.isFinite(options[key]) || options[key] < 0) {
            return [new RangeError(`${key} must be a non-negative finite number`)];
        }
    }
    const [err, url] = await getCDPUrl(options);
    if (err) {
        return [err];
    }
    const { WebSocket } = await import('ws');
    return connectWebSocket(WebSocket, url, options);
};


const CDPClient = async (cdpOptions) => {

    const defaultOptions = {
        session: null,
        url: null,
        port: 9222,
        host: 'localhost',
        secure: false,
        target: (targets) => {
            // defaults to first page
            const page = targets.find((it) => it.webSocketDebuggerUrl && it.type === 'page');
            if (page) {
                return page;
            }
            return targets.find((it) => it.webSocketDebuggerUrl);
        },
        ws: {},
        timeout: 10 * 1000,
        requestTimeout: 30 * 1000
    };

    if (typeof cdpOptions === 'string') {
        cdpOptions = {
            url: cdpOptions
        };
    }

    const options = {
        ... defaultOptions,
        ... cdpOptions
    };

    const [err, session] = await getCDPSession(options);

    return new Promise((resolve) => {

        if (err) {
            Util.logError(err);
            resolve();
            return;
        }

        const helper = new CoverageClient(session);
        resolve(helper);

    });

};

export { CDPClient };
