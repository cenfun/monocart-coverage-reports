const path = require('path');
const Util = require('../utils/util.js');

const { getSummaryColumns } = require('./console-summary.js');

const markdownSummaryReport = async (reportData, reportOptions, options) => {
    const msOptions = {
        // unicode, html, or empty for no color
        color: 'unicode',
        metrics: [],
        outputFile: 'coverage-summary.md',
        ... reportOptions
    };

    const color = Util.normalizeColorType(msOptions.color);

    const mdPath = path.resolve(options.outputDir, msOptions.outputFile);

    const metrics = Util.getMetrics(msOptions.metrics, reportData.type);

    const rows = metrics.map((k) => {
        return {
            ... reportData.summary[k],
            name: Util.capitalizeFirstLetter(k)
        };
    });

    const columns = getSummaryColumns(color);

    const markdownGrid = Util.markdownGrid({
        options: {
            name: reportData.name
        },
        columns,
        rows
    });

    await Util.writeFile(mdPath, markdownGrid);
    return Util.relativePath(mdPath);
};

module.exports = {
    markdownSummaryReport
};
