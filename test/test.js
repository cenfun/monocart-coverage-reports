const EC = require('eight-colors');
const { spawn } = require('node:child_process');
const Util = require('../lib/utils/util.js');

const executeNpmRun = (item) => {
    const nv = process.versions.node;

    if (Util.cmpVersion(nv, '18') < 0) {

        // puppeteer drop support for node16
        if (item.includes('puppeteer')) {
            EC.logYellow('Ignore test puppeteer - node < 18');
            return 0;
        }

        // The minimal required Node version is now 18.0.0
        if (item.includes('rollup')) {
            EC.logYellow('Ignore test rollup - node < 18');
            return 0;
        }

    }

    if (Util.cmpVersion(nv, '20.6.0') < 0) {

        // module register added in Node.js: v20.6.0
        if (item.includes('tsx')) {
            EC.logYellow('Ignore test tsx - node < 20.6');
            return 0;
        }

    }

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
            'test-minify',
            'test-esbuild',
            'test-rollup',
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
        'test-tsx',
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
