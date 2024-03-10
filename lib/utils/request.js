const http = require('http');
const https = require('https');

// minimal http request for get sourcemap json
// https://nodejs.org/docs/latest/api/http.html#httprequesturl-options-callback
const request = (options) => {

    const url = `${options.url}`;
    const HTTP = url.startsWith('https') ? https : http;
    // console.log('request', url);

    return new Promise((resolve) => {

        // get method only
        HTTP.get(url, options, (res) => {
            const { statusCode } = res;

            // Any 2xx status code signals a successful response but here we're only checking for 200.
            if (statusCode !== 200) {
                // Consume response data to free up memory
                res.resume();
                const resErr = new Error(`Request Failed. Status Code: ${statusCode}`);
                resolve([resErr]);
                return;
            }

            res.setEncoding('utf8');

            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });

            res.on('end', () => {

                let dataErr;
                let data = rawData;

                // parse json
                const contentType = res.headers['content-type'];
                if ((/^application\/json/).test(contentType)) {
                    try {
                        data = JSON.parse(rawData);
                    } catch (e) {
                        dataErr = e;
                    }
                }

                res.data = data;
                resolve([dataErr, res]);

            });

        }).on('error', (httpErr) => {

            resolve([httpErr]);

        });

    });
};

module.exports = request;
