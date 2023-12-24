const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const webpack = require('webpack');

const { rollup } = require('rollup');
const rollupTypescript = require('@rollup/plugin-typescript');
const rollupCommonJs = require('@rollup/plugin-commonjs');

const EC = require('eight-colors');

const webpackConfIstanbul = require('../test/webpack.config-istanbul.js');
const webpackConfV8 = require('../test/webpack.config-v8.js');

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
    console.log(EC.green('finish webpack istanbul build'));
};

const runWebpackV8 = async () => {
    await startWebpack(webpackConfV8);
    console.log(EC.green('finish webpack v8 build'));
};

const runEsbuild = async () => {
    const entry = path.resolve('test/mock/src/index.js');
    const outfile = path.resolve('test/mock/esbuild/dist/coverage-esbuild.js');

    await esbuild.build({
        entryPoints: [entry],
        outfile: outfile,
        sourcemap: true,
        minify: false,
        bundle: true,

        // this is only for legal comments (copyright,license), not code comments
        // esbuild do not support keep code comments: https://github.com/evanw/esbuild/issues/1439
        legalComments: 'inline',

        target: 'es2020',
        platform: 'browser'

    }).catch((err) => {
        EC.logRed(err);
        process.exit(1);
    });

    if (!fs.existsSync(outfile)) {
        EC.logRed(`Not found out file: ${outfile}`);
        process.exit(1);
    }

    console.log(EC.green('finish esbuild'));
};

const runRollup = async () => {

    const entry = path.resolve('test/mock/src/index.js');

    const inputOptions = {
        input: entry,
        plugins: [
            rollupCommonJs(),
            rollupTypescript({
                sourceMap: true,
                inlineSources: true
            })
        ]
    };

    const outputOptions = {
        file: path.resolve('test/mock/rollup/dist/coverage-rollup.js'),
        name: 'coverageRollup',
        format: 'iife',
        sourcemap: true
    };

    let bundle;
    let buildFailed = false;
    try {
        // create a bundle
        bundle = await rollup(inputOptions);

        await bundle.write(outputOptions);
        console.log(EC.green('finish rollup'));

    } catch (error) {
        buildFailed = true;
        // do some error reporting
        console.error(error);
    }
    if (bundle) {
        // closes the bundle
        await bundle.close();
    }
    process.exit(buildFailed ? 1 : 0);
};
const build = async () => {
    await runWebpackIstanbul();
    await runWebpackV8();
    await runEsbuild();
    await runRollup();

};

build();