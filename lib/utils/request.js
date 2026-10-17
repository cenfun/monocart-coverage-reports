import http from 'node:http';
import https from 'node:https';

const readResponse = async (res) => {
    if (res.statusCode !== 200) {
        res.destroy();
        return [new Error(`Request Failed. Status Code: ${res.statusCode}`)];
    }
    res.setEncoding('utf8');
    let rawData = '';
    // Async iteration rejects on response errors and premature connection close.
    for await (const chunk of res) {
        rawData += chunk;
    }
    let dataErr;
    let data = rawData;
    if ((/^application\/json/).test(res.headers['content-type'])) {
        try {
            data = JSON.parse(rawData);
        } catch (error) {
            dataErr = error;
        }
    }
    res.data = data;
    return [dataErr, res];
};

// Keep the existing [error, IncomingMessage] API and Node HTTP options.
// timeout is a total deadline (headers and body); 0 explicitly disables it.
const requestHTTP = (url, options) => new Promise((resolve) => {
    const { timeout = 30000, ... requestOptions } = options;
    const HTTP = url.startsWith('https:') ? https : http;
    let req;
    let timer;
    let settled = false;
    const finish = (result) => {
        if (settled) {
            return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(result);
    };
    const fail = (error) => {
        finish([error]);
        req?.destroy();
    };
    try {
        req = HTTP.get(url, requestOptions, (res) => {
            readResponse(res).then(finish, fail);
        });
        req.once('error', fail);
        if (timeout > 0) {
            timer = setTimeout(() => {
                const error = new Error(`Request timed out after ${timeout}ms: ${url}`);
                error.code = 'ETIMEDOUT';
                fail(error);
            }, timeout);
        }
    } catch (error) {
        fail(error);
    }
});

const resolveRequestURL = (url, options) => {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new TypeError(`Unsupported request protocol: ${urlObj.protocol}`);
    }
    const { timeout = 30000 } = options;
    if (!Number.isFinite(timeout) || timeout < 0) {
        throw new RangeError('Request timeout must be a non-negative finite number');
    }
    return urlObj;
};

const shouldRetryIPv4 = (err, urlObj, options) => err?.code === 'ECONNREFUSED'
    && urlObj.hostname === 'localhost' && !options.signal?.aborted;

const request = async (url, options = {}) => {
    let urlObj;
    try {
        urlObj = resolveRequestURL(url, options);
    } catch (error) {
        return [error];
    }

    const [err, res] = await requestHTTP(urlObj.toString(), options);
    // IPv4-only servers can reject localhost's IPv6 address on modern Node too.
    // Do not repeat timeouts, aborts, HTTP failures or JSON parsing errors.
    if (shouldRetryIPv4(err, urlObj, options)) {
        urlObj.hostname = '127.0.0.1';
        return requestHTTP(urlObj.toString(), options);
    }
    return [err, res];
};

export { request };
