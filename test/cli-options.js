
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

    name: 'My CLI Coverage Report',

    reports: 'v8,console-summary,raw,codecov',

    assetsPath: '../assets',

    lcov: true,

    onStart: async (coverageReport) => {

        const list = [];
        addEmptyCoverage(list, 'test/mock/src');
        addEmptyCoverage(list, 'test/mock/node/lib');

        await coverageReport.add(list);

    },

    // sourcePath: (filePath) => {
    //     const pre = 'monocart-coverage-reports/';
    //     if (filePath.startsWith(pre)) {
    //         return filePath.slice(pre.length);
    //     }
    //     return filePath;
    // },
    sourcePath: {
        'monocart-coverage-reports/': ''
    },

    // entryFilter: (entry) => {
    //     return entry.url.includes('mock/node') || entry.url.search(/src\/.+/) !== -1;
    // },
    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,

    entryFilter: '{**/mock/node/**,**/src/**}',
    sourceFilter: '**/src/**',

    onEnd: () => {
        console.log('test cli end');
    }

};
