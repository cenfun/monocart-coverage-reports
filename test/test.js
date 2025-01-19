const { spawn } = require('node:child_process');
const Util = require('../lib/utils/util.js');


const executeNpmRun = (item) => {

    return new Promise((resolve) => {
        const worker = spawn(`npm run ${item}`, {
            shell: true,
            stdio: 'inherit'
        });

        worker.on('close', (code) => {
            resolve(code);
        });

    });
};

const test = async (type) => {

    // remove assets
    Util.rmSync('./docs/assets');

    const groups = {

        '--node': [
            'test-node-env',
            'test-node-api',
            'test-node-ins',
            'test-node-cdp',
            'test-node-fgc',
            'test-node-vm',
            'test-node-koa'
        ],

        '--browser': [
            'test-istanbul',
            'test-v8',
            'test-puppeteer',
            'test-anonymous',
            'test-css',
            'test-client',
            'test-minify',
            'test-esbuild',
            'test-rollup',
            'test-swc',
            'test-sections',
            'test-v8-and-istanbul'
        ]
    };

    const list = groups[type];
    if (list) {
        const codes = await Promise.all(list.map((item) => executeNpmRun(item)));
        if (codes.find((c) => c !== 0)) {
            process.exit(1);
        }
        return;
    }

    // test all
    const all = [
        'test-node',
        'test-browser',
        'test-cli',
        'test-merge'
    ];

    for (const item of all) {
        const code = await executeNpmRun(item);
        if (code !== 0) {
            process.exit(1);
        }
    }


};

test(process.argv.pop());
