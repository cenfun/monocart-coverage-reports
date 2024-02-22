
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const Util = require('../lib/utils/util.js');

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

    onEnd: () => {
        console.log('test mcr end');
    }

};
