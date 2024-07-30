const { pathToFileURL } = require('url');
const Util = require('../utils/util.js');

const customReport = async (reportName, reportData, reportOptions, globalOptions) => {
    let CustomReporter;
    let err;
    try {
        CustomReporter = await import(reportName);
    } catch (e) {
        err = e;
        try {
            CustomReporter = await import(pathToFileURL(reportName));
        } catch (ee) {
            err = ee;
        }
    }

    if (!CustomReporter) {
        Util.logError(err.message);
        return;
    }

    CustomReporter = CustomReporter.default || CustomReporter;

    const reporter = new CustomReporter(reportOptions, globalOptions);

    const results = await reporter.generate(reportData);

    return results;
};

module.exports = {
    customReport
};
