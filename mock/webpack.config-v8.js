const path = require('path');
module.exports = {
    // mode: 'production',
    mode: 'development',

    devtool: 'source-map',

    entry: path.resolve('mock/src/index.js'),

    output: {
        path: path.resolve('mock/v8/dist'),
        filename: 'coverage-v8.js',
        umdNamedDefine: true,
        library: 'coverage-v8',
        libraryTarget: 'umd'
    },

    module: {
        rules: [{
            test: /\.js$/,
            use: {
                loader: 'babel-loader'
            }
        }]
    }
};
