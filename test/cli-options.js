
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const Util = require('../lib/utils/util.js');

const addEmptyCoverage = (list, dir, distFile, sourceRoot) => {
    // add empty coverage
    Util.forEachFile(dir, [], (filename, p) => {

        const filePath = path.resolve(p, filename);
        const source = fs.readFileSync(filePath).toString('utf-8');

        const resPath = Util.relativePath(filePath);

        const sourcePath = sourceRoot ? `${sourceRoot}/${resPath}` : resPath;

        const url = pathToFileURL(sourcePath).toString();

        const extname = path.extname(filename);
        if (['.css'].includes(extname)) {

            list.push({
                url,
                ranges: [],
                distFile,
                text: source
            });

            return;
        }

        list.push({
            url,
            functions: [{
                functionName: '',
                ranges: [{
                    startOffset: 0,
                    endOffset: source.length,
                    count: 0
                }]
            }],
            distFile,
            source
        });

    });
};

module.exports = {

    // logging: 'debug',

    onStart: async (coverageReport) => {

        const list = [];
        addEmptyCoverage(list, 'test/mock/src', 'coverage-node.js', 'monocart-coverage-reports');
        addEmptyCoverage(list, 'test/mock/node/lib');

        await coverageReport.add(list);

    },

    entryFilter: (entry) => {
        return entry.url.includes('mock/node') || entry.url.search(/src\/.+/) !== -1;
    },

    sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,

    onEnd: () => {
        console.log('test cli end');
    }

};
