import path from 'node:path';
export default {
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
            type: 'javascript/auto',
            use: {
                loader: 'babel-loader'
            }
        }, {
            test: /\.tsx?$/,
            use: 'ts-loader'
        }]
    }
};
