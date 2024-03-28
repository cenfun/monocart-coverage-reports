
const EC = require('eight-colors');

const { WebSocket } = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const WSSession = require('./ws-session.js');
const CoverageClient = require('./coverage-client.js');

const getDebuggerUrl = async (options) => {

    const protocol = options.secure ? 'https' : 'http';

    const url = `${protocol}://${options.host}:${options.port}/json/list`;
    const [err, res] = await Util.request(url);
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

const getCDPSession = async (options) => {

    if (options.session) {
        return [null, options.session];
    }

    // create session
    const [err, url] = await getCDPUrl(options);

    return new Promise((resolve) => {

        if (err) {
            resolve([err]);
            return;
        }

        const timeoutId = setTimeout(() => {
            resolve([new Error(`Timeout to connect: ${url}`)]);
        }, options.timeout);

        Util.logDebug(`Connect to ${url}`);
        const ws = new WebSocket(url, [], {
            maxPayload: 256 * 1024 * 1024,
            perMessageDeflate: false,
            followRedirects: true,
            ... options.ws
        });

        ws.once('error', (wsErr) => {
            clearTimeout(timeoutId);
            resolve([wsErr]);
        });

        ws.once('open', () => {
            clearTimeout(timeoutId);
            Util.logDebug(`${EC.green('Connected')} ${url}`);
            const session = new WSSession(ws);
            resolve([null, session]);
        });

    });


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
        timeout: 10 * 1000
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

module.exports = CDPClient;
