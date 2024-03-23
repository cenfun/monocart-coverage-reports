const EC = require('eight-colors');
const webpack = require('webpack');
const webpackConfIstanbul = require('./webpack.config-istanbul.js');
const webpackConfV8 = require('./webpack.config-v8.js');
const webpackConfNode = require('./webpack.config-node.js');

const esbuildConf = require('./esbuild.config.js');

const rollupConf = require('./rollup.config.js');

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
    const esbuild = require('esbuild');
    await esbuild.build(esbuildConf).catch((err) => {
        EC.logRed(err);
    });
    console.log(EC.green('finish esbuild'));
};

const runRollup = async () => {
    const { rollup } = require('rollup');

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

const build = async () => {
    await runWebpackIstanbul();
    await runWebpackV8();
    await runWebpackNode();

    await runEsbuild();

    try {
        await runRollup();
    } catch (e) {
        // do not support node 14
        console.log(e.message);
    }

};

build();
