const path = require('path');
module.exports = {
    mode: 'production',

    devtool: 'source-map',

    entry: path.resolve('tests/mock/src/index.js'),

    output: {
        path: path.resolve('tests/mock/v8/'),
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
