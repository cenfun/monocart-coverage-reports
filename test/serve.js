
const path = require('path');
const http = require('http');
const EC = require('eight-colors');
const KSR = require('koa-static-resolver');
const Koa = require('koa');

const serve = (port, mockName) => {
    const mockDir = path.resolve(__dirname, 'mock', mockName);
    console.log('serve mock dir', mockName);

    const app = new Koa();
    app.use(KSR({
        dirs: [mockDir],
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        gzip: false,
        // max-age=<seconds>
        maxAge: 1
    }));

    const server = http.createServer(app.callback());

    return new Promise((resolve) => {

        server.listen(port, function() {
            EC.logCyan(`${new Date().toLocaleString()} server listening on ${port}`);
            resolve({
                server,
                serverUrl: `http://localhost:${port}`
            });
        });

    });

};

module.exports = serve;
