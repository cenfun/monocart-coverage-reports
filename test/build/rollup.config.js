import path from 'node:path';
import rollupTypescript from '@rollup/plugin-typescript';
import rollupCommonJs from '@rollup/plugin-commonjs';

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
            tsconfig: path.resolve('test/tsconfig.json'),
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


export default {
    input: inputOptions,
    output: outputOptions
};
