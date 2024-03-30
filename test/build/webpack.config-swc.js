const path = require('path');
module.exports = {
    // mode: 'production',
    mode: 'development',

    devtool: 'source-map',

    entry: path.resolve('test/mock/src/index.js'),

    output: {
        path: path.resolve('test/mock/swc/dist'),
        filename: 'coverage-swc.js',
        umdNamedDefine: true,
        library: 'coverage-swc',
        libraryTarget: 'umd'
    },

    module: {
        rules: [{
            test: /\.m?js$/,
            exclude: /(node_modules)/,
            use: {
                loader: 'swc-loader'
            }
        }, {
            test: /\.tsx?$/,
            use: 'ts-loader'
        }]
    }
};
