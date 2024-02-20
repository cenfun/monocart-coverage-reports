const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const webpack = require('webpack');
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
    console.log(EC.green('finish webpack istanbul'));
};

const runWebpackV8 = async () => {
    await startWebpack(webpackConfV8);
    console.log(EC.green('finish webpack v8'));
};

const runEsbuild = async () => {
    const esbuild = require('esbuild');
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
    });

    if (!fs.existsSync(outfile)) {
        EC.logRed(`Not found out file: ${outfile}`);
    }

    console.log(EC.green('finish esbuild'));
};

const runRollup = async () => {
    const { rollup } = require('rollup');
    const rollupTypescript = require('@rollup/plugin-typescript');
    const rollupCommonJs = require('@rollup/plugin-commonjs');

    const entry = path.resolve('test/mock/src/index.js');

    const inputOptions = {
        input: entry,
        treeshake: false,
        plugins: [
            rollupCommonJs({
                transformMixedEsModules: true,
                extensions: ['.js', '.ts']
            }),
            rollupTypescript({
                sourceMap: true,
                inlineSources: true
            })
        ]
    };

    const outputOptions = {
        file: path.resolve('test/mock/rollup/dist/coverage-rollup.js'),
        name: 'coverageRollup',
        format: 'umd',
        sourcemap: true
    };

    let bundle;
    try {
        // create a bundle
        bundle = await rollup(inputOptions);

        await bundle.write(outputOptions);
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

const runNode = async () => {

    await startWebpack({
        mode: 'development',

        devtool: 'source-map',

        entry: path.resolve('test/mock/node/src/index.js'),

        output: {
            path: path.resolve('test/mock/node/dist'),
            filename: 'coverage-node.js',
            libraryTarget: 'commonjs'
        },

        module: {
            rules: [{
                test: /\.js$/,
                use: {
                    loader: 'babel-loader'
                }
            }, {
                test: /\.tsx?$/,
                use: 'ts-loader'
            }]
        }
    });
    console.log(EC.green('finish webpack node'));

};

const build = async () => {
    await runWebpackIstanbul();
    await runWebpackV8();
    await runEsbuild();
    try {
        await runRollup();
    } catch (e) {
        // do not support node 14
        console.log(e.message);
    }
    await runNode();
};

build();
