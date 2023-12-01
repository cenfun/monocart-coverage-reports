const path = require('path');
module.exports = {
    mode: 'development',

    devtool: 'source-map',

    entry: path.resolve('tests/mock/src/index.js'),

    output: {
        path: path.resolve('tests/mock/istanbul/'),
        filename: 'coverage-istanbul.js',
        umdNamedDefine: true,
        library: 'coverage-istanbul',
        libraryTarget: 'umd'
    },

    module: {
        rules: [{
            test: /\.js$/,
            use: {
                loader: 'babel-loader',
                options: {
                    plugins: ['babel-plugin-istanbul']
                }
            }
        }]
    }
};
