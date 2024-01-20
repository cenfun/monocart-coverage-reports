
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const Util = require('../lib/utils/util.js');

const addEmptyCoverage = (list, dir, distFile) => {
    // add empty coverage
    Util.forEachFile(dir, [], (filename, p) => {

        const filePath = path.resolve(p, filename);
        const source = fs.readFileSync(filePath).toString('utf-8');

        const sourcePath = Util.relativePath(filePath);

        const url = pathToFileURL(sourcePath).toString();

        const extname = path.extname(filename);
        if (['.css'].includes(extname)) {

            list.push({
                empty: true,
                type: 'css',
                url,
                distFile,
                text: source
            });

            return;
        }

        list.push({
            empty: true,
            type: 'js',
            url,
            distFile,
            source
        });

    });
};

module.exports = {

    // logging: 'debug',

    name: 'My CLI Coverage Report',

    reports: [
        'v8',
        'console-summary'
    ],

    lcov: true,

    onStart: async (coverageReport) => {

        const list = [];
        addEmptyCoverage(list, 'test/mock/src', 'coverage-node.js');
        addEmptyCoverage(list, 'test/mock/node/lib');

        await coverageReport.add(list);

    },

    sourcePath: (filePath) => {
        const pre = 'monocart-coverage-reports/';
        if (filePath.startsWith(pre)) {
            return filePath.slice(pre.length);
        }
        return filePath;
    },

    entryFilter: (entry) => {
        return entry.url.includes('mock/node') || entry.url.search(/src\/.+/) !== -1;
    },

    sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,

    onEnd: () => {
        console.log('test cli end');
    }

};
