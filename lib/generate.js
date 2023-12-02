const fs = require('fs');
const path = require('path');

const Util = require('./utils/util.js');
const {
    initIstanbulData, mergeIstanbulCoverage, saveIstanbulReport
} = require('./istanbul/istanbul.js');

const { mergeV8Coverage, saveV8Report } = require('./v8/v8.js');

const { convertV8List } = require('./converter/converter.js');

// ========================================================================================================

const generateV8ListReport = async (v8list, coverageData, fileSources, options) => {
    const { toIstanbul, lcov } = options;
    const istanbulReport = toIstanbul || lcov;
    const v8Report = !toIstanbul;

    let report;
    if (istanbulReport) {
        report = await saveIstanbulReport(coverageData, fileSources, options);
    }
    if (v8Report) {
        report = await saveV8Report(v8list, options);
    }

    return report;
};

// ========================================================================================================

const generateCoverageReport = async (dataList, options) => {

    // get first and check v8list or istanbul data
    const firstData = dataList[0];
    const dataType = firstData.type;
    // console.log('data type', dataType);

    // v8list
    if (dataType === 'v8') {
        // merge v8list first
        const v8list = await mergeV8Coverage(dataList, options);
        // console.log('after merge', v8list.map((it) => it.url));

        const { coverageData, fileSources } = await convertV8List(v8list, options);
        return generateV8ListReport(v8list, coverageData, fileSources, options);

    }

    // istanbul data
    const istanbulData = mergeIstanbulCoverage(dataList, options);
    const { coverageData, fileSources } = initIstanbulData(istanbulData, options);
    return saveIstanbulReport(coverageData, fileSources, options);

};


const getCoverageDataList = async (cacheDir) => {
    const files = fs.readdirSync(cacheDir).filter((f) => f.startsWith('coverage-'));
    if (!files.length) {
        return;
    }

    const dataList = [];
    for (const item of files) {
        const content = await Util.readFile(path.resolve(cacheDir, item));
        if (content) {
            dataList.push(JSON.parse(content));
        }
    }

    if (dataList.length) {
        return dataList;
    }
};


module.exports = {
    getCoverageDataList,
    generateCoverageReport
};
