const path = require('path');
const Util = require('../utils/util.js');

const v8JsonReport = async (reportData, reportOptions, options) => {
    const v8JsonOptions = {
        outputFile: 'coverage-report.json',
        ... reportOptions
    };

    // console.log(mergedOptions);
    const jsonPath = path.resolve(options.outputDir, v8JsonOptions.outputFile);
    const reportPath = Util.relativePath(jsonPath);

    reportData.reportPath = reportPath;

    await Util.writeFile(jsonPath, JSON.stringify(reportData));
    return reportPath;
};

module.exports = {
    v8JsonReport
};
