import { execa } from 'execa';
import { Util } from '../lib/utils/util.js';
import { cleanSite } from '../scripts/clean-site.js';


const executeNpmRun = async (item) => {
    const result = await execa('npm', ['run', item], {
        stdio: 'inherit',
        reject: false
    });
    return result.exitCode ?? 1;
};

const test = async (type) => {

    // Remove obsolete report redirects without erasing the documentation.
    await cleanSite();

    // remove assets
    Util.rmSync('./.temp/site/reports/assets');

    const groups = {

        '--node': [
            'test-node-env',
            'test-node-api',
            'test-node-ins',
            'test-node-cdp',
            'test-node-fgc',
            'test-node-vm',
            'test-node-koa',
            'test-node-ts',
            'test-mcr-test-ts'
        ],

        '--browser': [
            'test-istanbul',
            'test-v8',
            'test-v8-app',
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
