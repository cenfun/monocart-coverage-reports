const path = require('path');
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


module.exports = {
    input: inputOptions,
    output: outputOptions
};
