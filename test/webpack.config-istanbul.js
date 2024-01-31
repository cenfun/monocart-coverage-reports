const path = require('path');
module.exports = {
    mode: 'development',

    devtool: 'source-map',

    entry: path.resolve('test/mock/src/index.js'),

    output: {
        path: path.resolve('test/mock/istanbul/dist'),
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
                        ['istanbul', {
                            // the test or tests folder will be excluded by default
                            // https://github.com/istanbuljs/schema/blob/master/default-exclude.js
                            exclude: []
                        }]
                    ]
                }
            }
        }, {
            test: /\.tsx?$/,
            use: [
                '@jsdevtools/coverage-istanbul-loader',
                'ts-loader'
            ]
        }]
    }
};
