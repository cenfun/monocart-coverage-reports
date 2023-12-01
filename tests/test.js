const path = require('path');
const http = require('http');
const EC = require('eight-colors');
const KSR = require('koa-static-resolver');
const Koa = require('koa');

const testV8 = require('./test-v8.js');
const testIstanbul = require('./test-istanbul.js');

const serverPort = 8130;
const serverUrl = `http://localhost:${serverPort}`;

const serve = () => {
    const mockDir = path.resolve(__dirname, './mock');

    console.log('serve dir', mockDir);

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

        server.listen(serverPort, function() {
            EC.logCyan(`${new Date().toLocaleString()} server listening on ${serverUrl}`);
            resolve(server);
        });

    });


};

const test = async () => {

    console.log('start server ...');
    const server = await serve();

    await testV8(serverUrl);
    await testIstanbul(serverUrl);

    console.log('close server ...');
    server.close();
};


test();
