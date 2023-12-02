const fs = require('fs');
const path = require('path');
const http = require('http');
const EC = require('eight-colors');
const KSR = require('koa-static-resolver');
const Koa = require('koa');

const testV8 = require('./test-v8.js');
const testV8Minify = require('./test-v8-minify.js');

const testIstanbul = require('./test-istanbul.js');

const serverPort = 8130;
const serverUrl = `http://localhost:${serverPort}`;

const serve = () => {
    const mockDir = path.resolve(__dirname, '../mock');

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

    // remove assets dir if out of output dir
    const assetsDir = path.resolve('docs/assets');
    if (fs.existsSync(assetsDir)) {
        fs.rmSync(assetsDir, {
            recursive: true,
            force: true
        });
    }


    await Promise.all([
        testV8(serverUrl),
        testV8Minify(serverUrl),
        testIstanbul(serverUrl)
    ]);

    console.log('close server ...');
    server.close();
};


test();
