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

const startWebpack = function(conf) {
    return new Promise(function(resolve) {
        webpack(conf, (err, stats) => {

            // error for webpack self
            if (err) {
                EC.logRed(err.stack || err);
                if (err.details) {
                    EC.logRed(err.details);
                }
                process.exit(1);
            }

            if (stats.hasErrors()) {

                const report = stats.toJson();
                const errorList = report.errors;
                EC.logRed(`ERROR: Found ${errorList.length} Errors`);
                if (errorList.length > 10) {
                    errorList.length = 10;
                    EC.logRed('Top 10 errors:');
                }
                errorList.forEach(function(item, i) {
                    const msg = item.stack || item.message;
                    EC.logRed(`【${i + 1}】 ${msg}`);
                });
            }

            resolve();
        });
    });
};

const runWebpackIstanbul = async () => {
    await startWebpack(webpackConfIstanbul);
    console.log(EC.green('finish webpack istanbul'));
};

const runWebpackV8 = async () => {
    await startWebpack(webpackConfV8);
    console.log(EC.green('finish webpack v8'));
};

const runWebpackNode = async () => {
    await startWebpack(webpackConfNode);
    console.log(EC.green('finish webpack node'));
};

const runEsbuild = async () => {
    await esbuild.build(esbuildConf).catch((err) => {
        EC.logRed(err);
    });
    console.log(EC.green('finish esbuild'));
};

const runRollup = async () => {

    let bundle;
    try {
        // create a bundle
        bundle = await rollup(rollupConf.input);

        await bundle.write(rollupConf.output);
        console.log(EC.green('finish rollup'));

    } catch (error) {
        // do some error reporting
        console.error(error);
    }
    if (bundle) {
        // closes the bundle
        await bundle.close();
    }

};

const runSwc = async () => {
    await startWebpack(webpackConfSwc);
    console.log(EC.green('finish webpack swc'));
};

const build = async () => {
    await runWebpackIstanbul();
    await runWebpackV8();
    await runWebpackNode();

    await runEsbuild();

    await runRollup();

    await runSwc();

};

build();
