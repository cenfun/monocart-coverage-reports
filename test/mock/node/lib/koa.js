const http = require('http');
const Koa = require('koa');
const app = new Koa();

app.use((ctx) => {
    console.log('koa path', ctx.path);
    if (ctx.path === '/test') {
        console.log('test');
    }

    ctx.body = 'Hello World';
});

const server = http.createServer(app.callback());

server.on('error', (err) => {
    console.log(err);
});

const port = 3080;
server.listen(port, function() {
    console.log(`server listening on http://localhost:${port}`);
});
