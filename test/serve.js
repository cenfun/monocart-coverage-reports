
import path from 'node:path';
import http from 'node:http';
import EC from 'eight-colors';
import KSR from 'koa-static-resolver';
import Koa from 'koa';

const serve = (port, mockName) => {
    const mockDir = path.resolve(import.meta.dirname, 'mock', mockName);
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

export default serve;
