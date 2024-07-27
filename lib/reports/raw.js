const fs = require('fs');
const path = require('path');
const Util = require('../utils/util.js');

const rawReport = (reportData, reportOptions, options) => {
    const rawOptions = {
        outputDir: 'raw',
        ... reportOptions
    };

    const cacheDir = options.cacheDir;
    const rawDir = path.resolve(options.outputDir, rawOptions.outputDir);
    // console.log(rawDir, cacheDir);
    if (fs.existsSync(rawDir)) {
        Util.logError(`Failed to save raw report because the dir already exists: ${Util.relativePath(rawDir)}`);
        return;
    }

    const rawParent = path.dirname(rawDir);
    if (!fs.existsSync(rawParent)) {
        fs.mkdirSync(rawParent, {
            recursive: true
        });
    }

    // just rename the cache folder name
    fs.renameSync(cacheDir, rawDir);

};

module.exports = {
    rawReport
};
