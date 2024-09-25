const fs = require('fs');
const path = require('path');
const Util = require('../utils/util.js');
const { ZipFile } = require('../packages/monocart-coverage-vendor.js');

const rawReport = (reportData, reportOptions, options) => {
    const rawOptions = {
        outputDir: 'raw',
        zip: false,
        ... reportOptions
    };

    const cacheDir = options.cacheDir;
    const rawDir = path.resolve(options.outputDir, rawOptions.outputDir);
    // console.log(rawDir, cacheDir);
    if (fs.existsSync(rawDir)) {
        Util.rmSync(rawDir);
    }

    const rawParent = path.dirname(rawDir);
    if (!fs.existsSync(rawParent)) {
        fs.mkdirSync(rawParent, {
            recursive: true
        });
    }

    // just rename the cache folder name
    fs.renameSync(cacheDir, rawDir);

    // zip
    if (!rawOptions.zip) {
        return;
    }

    const zipName = path.basename(rawDir);
    const zipPath = path.resolve(rawParent, `${zipName}.zip`);

    return new Promise((resolve) => {
        const zipFile = new ZipFile();
        zipFile.outputStream.pipe(fs.createWriteStream(zipPath)).on('close', function() {

            // remove raw files after zip
            Util.rmSync(rawDir);

            // console.log('done');
        });
        const list = fs.readdirSync(rawDir);
        list.forEach((jsonName) => {
            zipFile.addFile(path.resolve(rawDir, jsonName), `${zipName}/${jsonName}`);
        });
        zipFile.end();
    });

};

module.exports = {
    rawReport
};
