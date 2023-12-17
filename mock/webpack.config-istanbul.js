// Do NOT put in tests folder
const path = require('path');
module.exports = {
    mode: 'development',

    devtool: 'source-map',

    entry: path.resolve('mock/src/index.js'),

    output: {
        path: path.resolve('mock/istanbul/dist'),
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
                    plugins: [
                        ['istanbul', {}]
                    ]
                }
            }
        }, {
            test: /\.tsx?$/,
            use: 'ts-loader'
        }]
    }
};
