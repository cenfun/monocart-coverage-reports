const EC = require('eight-colors');
const { spawn } = require('node:child_process');

const executeNpmRun = (item) => {

    const [major, minor] = process.versions.node.split('.').map((s) => parseInt(s));
    if (item.includes('puppeteer') && major <= 16) {
        EC.logYellow('Ignore test puppeteer - node <= 16');
        return;
    }

    if (item.includes('tsx') && parseFloat(`${major}.${minor}`) < 20.6) {
        EC.logYellow('Ignore test tsx - node < 20.6');
        return;
    }

    return new Promise((resolve) => {
        const worker = spawn(`npm run ${item}`, {
            shell: true,
            stdio: 'inherit'
        });

        worker.on('close', (code) => {
            resolve();
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
        Promise.all(list.map((item) => executeNpmRun(item)));
        return;
    }

    // test all
    const keys = Object.keys(groups);
    for (const k of keys) {
        await Promise.all(groups[k].map((item) => executeNpmRun(item)));
    }

    await executeNpmRun('test-cli');
    await executeNpmRun('test-tsx');
    await executeNpmRun('test-merge');

};

test(process.argv.pop());
