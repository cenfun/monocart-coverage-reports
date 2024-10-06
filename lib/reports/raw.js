const fs = require('fs');
const path = require('path');
const Util = require('../utils/util.js');
const { ZipFile } = require('../packages/monocart-coverage-vendor.js');
const { mergeIstanbulDataList } = require('../istanbul/istanbul.js');
const { mergeV8DataList } = require('../v8/v8.js');

const getMergedData = (type, dataList, options) => {
    if (type === 'istanbul') {
        return mergeIstanbulDataList(dataList, options);
    }
    return mergeV8DataList(dataList, options);
};

const mergeReport = async (rawDir, options) => {
    const coverageFiles = fs.readdirSync(rawDir).filter((n) => n.endsWith('.json') && n.startsWith('coverage-'));
    // console.log(coverageFiles);

    let type;
    const dataList = [];
    for (const coverageFile of coverageFiles) {
        const jsonPath = path.resolve(rawDir, coverageFile);
        const json = await Util.readJson(jsonPath);
        if (json) {
            // 'id', 'type', 'data'
            type = json.type;
            dataList.push(json);
        }
        Util.rmSync(jsonPath);
    }

    const mergedData = await getMergedData(type, dataList, options);

    const dataId = Util.uid();
    const results = {
        id: dataId,
        type,
        data: mergedData
    };

    const { cachePath } = Util.getCacheFileInfo('coverage', `${dataId}.merged`, rawDir);
    await Util.writeFile(cachePath, JSON.stringify(results));

};

const zipReport = (rawDir, rawParent) => {
    const zipName = path.basename(rawDir);
    const zipPath = path.resolve(rawParent, `${zipName}.zip`);

    return new Promise((resolve) => {
        const zipFile = new ZipFile();
        zipFile.outputStream.pipe(fs.createWriteStream(zipPath)).on('close', function() {

            // remove raw files after zip
            Util.rmSync(rawDir);

            resolve();

            // console.log('done');
        });
        const list = fs.readdirSync(rawDir);
        list.forEach((jsonName) => {
            zipFile.addFile(path.resolve(rawDir, jsonName), `${zipName}/${jsonName}`);
        });
        zipFile.end();
    });
};

const rawReport = async (reportData, reportOptions, options) => {
    const rawOptions = {
        outputDir: 'raw',
        merge: false,
        zip: false,
        ... reportOptions
    };

    const cacheDir = options.cacheDir;
    if (!fs.existsSync(cacheDir)) {
        // there is no cache if only inputDir
        Util.logInfo('There is no cache dir for "raw" report');
        return;
    }

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

    // merge
    if (rawOptions.merge) {
        await mergeReport(rawDir, options);
    }

    // zip
    if (rawOptions.zip) {
        await zipReport(rawDir, rawParent);
    }


};

module.exports = {
    rawReport
};
