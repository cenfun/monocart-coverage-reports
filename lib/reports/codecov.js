const path = require('path');
const Util = require('../utils/util.js');

const codecovReport = async (reportData, reportOptions, options) => {
    const codecovOptions = {
        outputFile: 'codecov.json',
        ... reportOptions
    };

    const jsonPath = path.resolve(options.outputDir, codecovOptions.outputFile);

    // https://docs.codecov.com/docs/codecov-custom-coverage-format
    const coverage = {};
    reportData.files.forEach((item) => {
        const { sourcePath, data } = item;
        coverage[sourcePath] = data.lines;
    });
    const codecovData = {
        coverage
    };

    await Util.writeFile(jsonPath, JSON.stringify(codecovData));
    return Util.relativePath(jsonPath);
};

module.exports = {
    codecovReport
};
