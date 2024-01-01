const path = require('path');
const { Worker } = require('worker_threads');
const Util = require('./util.js');

// do NOT use isMainThread because it could be executed in worker too. (worker in worker)

const decodeMappings = (mappings = '') => {
    if (typeof text !== 'string') {
        mappings = String(mappings);
    }

    return new Promise((resolve) => {

        const workerPath = path.resolve(__dirname, 'decode-mappings-worker.js');
        const worker = new Worker(workerPath);

        worker.on('message', (message) => {
            if (message === 'workerReady') {
                worker.postMessage(mappings);
                return;
            }
            resolve(message);
            worker.terminate();
        });

        worker.on('error', (e) => {
            Util.logError(e.message);
            resolve([]);
            worker.terminate();
        });

    });
};

module.exports = decodeMappings;
