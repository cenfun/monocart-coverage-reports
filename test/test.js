const fs = require('fs');
const path = require('path');
const http = require('http');
const EC = require('eight-colors');
const KSR = require('koa-static-resolver');
const Koa = require('koa');

const testV8EsBuild = require('./test-v8-esbuild.js');
const testV8Rollup = require('./test-v8-rollup.js');
const testV8Minify = require('./test-v8-minify.js');

const testV8AndIstanbul = require('./test-v8-and-istanbul.js');

const testPuppeteer = require('./test-puppeteer.js');

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

const testFunctions = () => {


    const { dedupeFlatRanges } = require('../lib/utils/dedupe.js');

    const ranges = [{
        start: 0, end: 10
    }, {
        start: 100, end: 200
    }, {
        start: 0, end: 15
    }, {
        start: 20, end: 30
    }, {
        start: 18, end: 25
    }, {
        start: 50, end: 60
    }, {
        start: 55, end: 58
    }, {
        start: 58, end: 66
    }, {
        start: 50, end: 80
    }, {
        start: 30, end: 50
    }];
    const newRanges = dedupeFlatRanges(ranges);
    console.log('dedupeFlatRanges', newRanges);

    console.assert(JSON.stringify(newRanges) === '[{"start":0,"end":15},{"start":18,"end":80},{"start":100,"end":200}]');
    console.log(EC.green('passed'), 'test dedupeFlatRanges');

};

const test = async () => {

    testFunctions();

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

        testV8AndIstanbul(serverUrl),

        testV8Minify(serverUrl),

        testV8EsBuild(serverUrl),
        testV8Rollup(serverUrl),

        testPuppeteer(serverUrl)
    ]);

    console.log('close server ...');
    server.close();
};


test();
