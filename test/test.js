import { execa } from 'execa';
import { Util } from '../lib/utils/util.js';


const executeNpmRun = async (item) => {
    const result = await execa('npm', ['run', item], {
        stdio: 'inherit',
        reject: false
    });
    return result.exitCode ?? 1;
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
            'test-css',
            'test-css-min',
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
        for (const item of list) {
            const code = await executeNpmRun(item);
            if (code !== 0) {
                process.exit(1);
                return;
            }
        }
        return;
    }

    // test all
    const all = [
        'test-node',
        'test-browser',
        'test-cli',
        'test-merge',
        'test-cp'
    ];

    for (const item of all) {
        const code = await executeNpmRun(item);
        if (code !== 0) {
            process.exit(1);
        }
    }


};

test(process.argv.pop());
