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

    // https://github.com/swc-project/pkgs/tree/main/packages/swc-loader
    module: {
        rules: [{
            test: /\.m?js$/,
            use: {
                loader: 'swc-loader',
                options: {
                    jsc: {
                        target: 'es6'
                    }
                }
            }
        }, {
            test: /\.ts$/,
            use: {
                loader: 'swc-loader',
                options: {
                    jsc: {
                        parser: {
                            syntax: 'typescript'
                        },
                        target: 'es6'
                    }
                }
            }
        }]
    }
};
