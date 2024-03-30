const path = require('path');
const entry = path.resolve('test/mock/src/index.js');
const outfile = path.resolve('test/mock/esbuild/dist/coverage-esbuild.js');

module.exports = {
    entryPoints: [entry],
    outfile: outfile,
    sourcemap: true,
    minify: false,
    treeShaking: false,
    bundle: true,

    // this is only for legal comments (copyright,license), not code comments
    // esbuild do not support keep code comments: https://github.com/evanw/esbuild/issues/1439
    legalComments: 'inline',

    target: 'es2020',
    platform: 'browser'

};
