const path = require('path');
const Assets = require('../assets.js');

const v8Report = async (reportData, reportOptions, options) => {

    // V8 only options, merged with root options
    const v8HtmlOptions = {
        outputFile: options.outputFile,
        inline: options.inline,
        assetsPath: options.assetsPath,
        metrics: options.metrics,
        ... reportOptions
    };

    // add metrics to data for UI
    reportData.metrics = v8HtmlOptions.metrics;

    const {
        outputFile, inline, assetsPath
    } = v8HtmlOptions;

    // resolve full report path
    const reportPath = path.resolve(options.outputDir, outputFile);
    const outputDir = path.dirname(reportPath);
    const htmlFile = path.basename(reportPath);

    const jsFiles = ['monocart-coverage-app'];
    // console.log(jsFiles);

    const htmlOptions = {
        reportData,
        jsFiles,
        inline,
        assetsPath,
        outputDir,
        htmlFile,

        saveReportPath: 'reportPath',

        reportDataFile: 'coverage-data.js'
    };

    // compress json data for html
    const htmlPath = await Assets.saveHtmlReport(htmlOptions);

    return htmlPath;
};

module.exports = {
    v8Report
};
