const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const EC = require('eight-colors');

const build = async () => {
    const entry = path.resolve('test/mock/src/index.js');
    const outfile = path.resolve('test/mock/esbuild/dist/coverage-esbuild.js');

    await esbuild.build({
        entryPoints: [entry],
        outfile: outfile,
        sourcemap: true,
        minify: false,
        bundle: true,

        // this is only for legal comments (copyright,license), not code comments
        // esbuild do not support keep code comments: https://github.com/evanw/esbuild/issues/1439
        legalComments: 'inline',

        target: 'es2020',
        platform: 'browser'

    }).catch((err) => {
        EC.logRed(err);
        process.exit(1);
    });

    if (!fs.existsSync(outfile)) {
        EC.logRed(`Not found out file: ${outfile}`);
        process.exit(1);
    }

    console.log(EC.green('finish esbuild'));

};

build();
