const path = require('path');
const Util = require('../utils/util.js');

const codacyReport = async (reportData, reportOptions, options) => {
    const codacyOptions = {
        outputFile: 'codacy.json',
        ... reportOptions
    };

    const jsonPath = path.resolve(options.outputDir, codacyOptions.outputFile);

    // https://api.codacy.com/swagger#tocscoveragereport
    const fileReports = [];
    reportData.files.forEach((item) => {
        const { sourcePath, data } = item;

        const coverage = {};
        for (const [key, value] of Object.entries(data.lines)) {
            if (typeof value === 'number') {
                coverage[key] = value;
            } else {
                // partial coverage not supported?
                coverage[key] = 0;
            }
        }

        fileReports.push({
            filename: sourcePath,
            coverage
        });
    });
    const codacyData = {
        fileReports
    };

    await Util.writeFile(jsonPath, JSON.stringify(codacyData));
    return Util.relativePath(jsonPath);
};


module.exports = {
    codacyReport
};
