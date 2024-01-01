const { parentPort } = require('worker_threads');
const { decode } = require('../packages/monocart-coverage-vendor.js');

parentPort.on('message', (message) => {
    const result = decode(message);
    parentPort.postMessage(result);
});

parentPort.postMessage('workerReady');
