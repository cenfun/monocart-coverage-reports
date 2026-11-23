import * as esbuild from 'esbuild';
import { rollup } from 'rollup';
import EC from 'eight-colors';
import webpack from 'webpack';

// istanbul requires building on server for right file path (relative)
import webpackConfIstanbul from './webpack.config-istanbul.js';
import webpackConfV8 from './webpack.config-v8.js';
import webpackConfNode from './webpack.config-node.js';
import webpackConfSwc from './webpack.config-swc.js';

import esbuildConf from './esbuild.config.js';
import rollupConf from './rollup.config.js';

const startWebpack = (conf) => new Promise((resolve, reject) => {
    webpack(conf, (err, stats) => {
        if (err) {
            reject(err);
            return;
        }

        if (stats.hasErrors()) {
            const { errors } = stats.toJson({
                all: false, errors: true
            });
            const details = errors.slice(0, 10).map((item, i) => `${i + 1}. ${item.message}`);
            const limit = errors.length > 10 ? ' (showing the first 10)' : '';
            reject(new Error(`Found ${errors.length} compilation errors${limit}:\n${details.join('\n')}`));
            return;
        }

        resolve();
    });
});

const runRollup = async () => {
    const bundle = await rollup(rollupConf.input);
    try {
        await bundle.write(rollupConf.output);
    } finally {
        await bundle.close();
    }
};

const build = async () => {
    const steps = [
        ['webpack istanbul', () => startWebpack(webpackConfIstanbul)],
        ['webpack v8', () => startWebpack(webpackConfV8)],
        ['webpack node', () => startWebpack(webpackConfNode)],
        ['esbuild', () => esbuild.build(esbuildConf)],
        ['rollup', runRollup],
        ['webpack swc', () => startWebpack(webpackConfSwc)]
    ];

    for (const [name, run] of steps) {
        try {
            await run();
        } catch (cause) {
            throw new Error(`Fixture build failed: ${name}`, {
                cause
            });
        }
        console.log(EC.green(`finish ${name}`));
    }
};

build().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
