const path = require('path');
module.exports = {
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
};
