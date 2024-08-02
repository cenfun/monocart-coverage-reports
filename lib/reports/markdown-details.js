const path = require('path');
const Util = require('../utils/util.js');

const { getRowData, getFilteredFiles } = require('./console-details.js');

const cutWithMaxCols = (str, maxCols, before) => {
    if (str && maxCols && str.length > maxCols) {
        if (before) {
            return `... ${str.slice(str.length - (maxCols - 4))}`;
        }
        return `${str.slice(0, maxCols - 4)} ...`;
    }

    return str;
};

const markdownDetailsReport = async (reportData, reportOptions, options) => {
    const mdOptions = {
        baseUrl: '',
        // unicode, html, or empty for no color
        color: 'unicode',
        maxCols: 50,
        skipPercent: 0,
        metrics: [],
        filter: null,
        outputFile: 'coverage-details.md',
        ... reportOptions
    };

    const baseUrl = mdOptions.baseUrl;
    const color = Util.normalizeColorType(mdOptions.color);
    const maxCols = Util.normalizeMaxCols(mdOptions.maxCols, 15);

    const mdPath = path.resolve(options.outputDir, mdOptions.outputFile);

    const metrics = Util.getMetrics(mdOptions.metrics, reportData.type);

    let files = reportData.files;
    const skipPercent = mdOptions.skipPercent;
    if (typeof skipPercent === 'number' && skipPercent > 0) {
        files = files.filter((file) => {
            const { summary } = file;
            for (const k of metrics) {
                const percent = summary[k].pct;
                if (typeof percent === 'number' && percent < skipPercent) {
                    return true;
                }
            }
            return false;
        });
    }

    files = getFilteredFiles(mdOptions.filter, files);

    const rows = [];
    files.forEach((file) => {

        // do NOT add debug file
        if (file.debug) {
            return;
        }

        const { sourcePath, summary } = file;

        const fileRow = getRowData(sourcePath, summary, metrics, color);

        let rowName = cutWithMaxCols(fileRow.name, maxCols, true);

        if (fileRow.nameStatus) {
            const nameColor = baseUrl && color === 'tex' ? '' : color;
            rowName = Util.getColorStrByStatus(rowName, fileRow.nameStatus, nameColor);
        }
        if (baseUrl) {
            rowName = `[${rowName}](${baseUrl + sourcePath})`;
        }

        fileRow.name = rowName;

        const uncoveredLines = Util.getUncoveredLines(file.data.lines, color);
        fileRow.uncoveredLines = cutWithMaxCols(uncoveredLines, maxCols);

        rows.push(fileRow);
    });

    const summaryRow = getRowData('Summary', reportData.summary, metrics, color);
    if (summaryRow.nameStatus) {
        summaryRow.name = Util.getColorStrByStatus(summaryRow.name, summaryRow.nameStatus, color);
    }
    rows.push(summaryRow);

    const columns = [{
        id: 'name',
        name: 'Name'
    }, ... metrics.map((m) => {
        return {
            id: m,
            name: Util.capitalizeFirstLetter(m),
            align: 'right'
        };
    }), {
        id: 'uncoveredLines',
        name: 'Uncovered Lines'
    }];

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
    markdownDetailsReport
};
