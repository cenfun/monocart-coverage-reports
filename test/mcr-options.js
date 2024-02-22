const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');
const EC = require('eight-colors');
const Util = require('../lib/utils/util.js');

const getJson = (p) => {
    return JSON.parse(fs.readFileSync(p));
};

const checkNodeResults = () => {
    console.log('checking 4 node results should be same');

    // fgc can not run in GA ci
    const list = ['api', 'cdp', 'env', 'ins'];

    list.reduce((p, c) => {

        const pJson = getJson(path.resolve(`./docs/v8-node-${p}/coverage-report.json`));
        const cJson = getJson(path.resolve(`./docs/v8-node-${c}/coverage-report.json`));

        // should be same except name
        pJson.name = null;
        cJson.name = null;

        assert.deepEqual(pJson, cJson);
        console.log(`${p} ${EC.green('=')} ${c}`);

        return c;
    });

};

const checkTestResults = async () => {
    console.log('checking test results ...');

    await checkNodeResults();

};


const addEmptyCoverage = (list, dir) => {
    // add empty coverage
    Util.forEachFile(dir, [], (filename, p) => {

        const filePath = path.resolve(p, filename);
        const source = fs.readFileSync(filePath).toString('utf-8');

        const sourcePath = Util.relativePath(filePath);

        const url = pathToFileURL(sourcePath).toString();

        const extname = path.extname(filename);

        // remove packages
        if (filename.startsWith('monocart-')) {
            return;
        }

        if (['.html', '.ts'].includes(extname)) {
            return;
        }

        // there is no css in lib
        if (['.css', '.scss'].includes(extname)) {

            list.push({
                empty: true,
                type: 'css',
                url,
                text: source
            });

            return;
        }

        list.push({
            empty: true,
            type: 'js',
            url,
            source
        });

    });
};

module.exports = {

    // logging: 'debug',

    name: 'My MCR Coverage Report',

    outputDir: 'docs/mcr',

    reports: 'v8,console-summary,codecov',

    assetsPath: '../assets',
    lcov: true,

    onStart: async (coverageReport) => {

        const list = [];
        addEmptyCoverage(list, 'lib');

        await coverageReport.add(list);

    },

    entryFilter: (entry) => {
        if (entry.url.includes('node_modules')) {
            return false;
        }

        if (entry.url.includes('packages/')) {
            return false;
        }

        return true;
    },

    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,

    onEnd: async () => {
        console.log('test done.');
        await checkTestResults();
    }

};
