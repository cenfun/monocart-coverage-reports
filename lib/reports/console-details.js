const CG = require('console-grid');
const EC = require('eight-colors');
const { getGroupedRows } = require('../utils/snapshot.js');
const Util = require('../utils/util.js');

const getRowData = (rowName, summary, metrics, color) => {
    const summaryRow = {};
    let lowest = {
        pct: 100,
        status: 'high'
    };
    metrics.map((k) => {
        const s = summary[k];
        if (!s) {
            return;
        }
        const percent = s.pct;
        if (typeof percent !== 'number') {
            return;
        }
        summaryRow[k] = Util.getColorStrByStatus(Util.PSF(percent, 100, 2), s.status, color);
        if (percent < lowest.pct) {
            lowest = s;
        }
    });
    summaryRow.nameStatus = lowest.status;
    summaryRow.name = rowName;
    return summaryRow;
};

const getDetailsRows = (files, metrics, cdOptions, color) => {

    const skipPercent = cdOptions.skipPercent;
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

    const flatRows = [];
    files.forEach((file) => {

        // do NOT add debug file
        if (file.debug) {
            return;
        }

        const { sourcePath, summary } = file;
        const fileRow = getRowData(sourcePath, summary, metrics, color);
        fileRow.uncoveredLines = Util.getUncoveredLines(file.data.lines, color);
        flatRows.push(fileRow);
    });

    return getGroupedRows(flatRows);
};

const getFileFilter = (input) => {
    // for function handler
    if (typeof input === 'function') {
        return input;
    }

    // for single minimatch pattern
    if (input && typeof input === 'string') {
        // string to multiple patterns "{...}"
        // mcr npx mocha --entryFilter {'**/node_modules/**':false,'**/src/*.js':true}
        // mcr npx mocha --entryFilter "{'**/node_modules/**': false, '**/src/*.js': true}"
        const obj = Util.strToObj(input);
        if (obj) {
            input = obj;
        } else {
            return (file) => {
                return Util.betterMinimatch(file.sourcePath, input);
            };
        }
    }

    // for patterns
    if (input && typeof input === 'object') {
        const patterns = Object.keys(input);
        return (file) => {
            const sourcePath = file.sourcePath;
            for (const pattern of patterns) {
                if (Util.betterMinimatch(sourcePath, pattern)) {
                    return input[pattern];
                }
            }
            // false if not matched
        };
    }

};

const getFilteredFiles = (filter, files) => {
    const fileFilter = getFileFilter(filter);
    if (fileFilter) {
        return files.filter(fileFilter);
    }
    return files;
};

const consoleDetailsReport = (reportData, reportOptions, options) => {
    const cdOptions = {
        maxCols: 50,
        skipPercent: 0,
        metrics: [],
        filter: null,
        ... reportOptions
    };

    const {
        type, name, summary
    } = reportData;

    if (name) {
        Util.logInfo(EC.cyan(name));
    }

    const color = 'ansicode';
    let files = reportData.files;
    files = getFilteredFiles(cdOptions.filter, files);

    const metrics = Util.getMetrics(cdOptions.metrics, type);
    const rows = getDetailsRows(files, metrics, cdOptions, color);
    const summaryRow = getRowData('Summary', summary, metrics, color);
    if (summaryRow.nameStatus) {
        summaryRow.name = Util.getColorStrByStatus(summaryRow.name, summaryRow.nameStatus, color);
    }
    // no rows if skipped all by skipPercent
    if (rows.length) {
        rows.push({
            innerBorder: true
        });
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

    return CG({
        options: {
            silent: cdOptions.silent,
            nullPlaceholder: '',
            defaultMaxWidth: cdOptions.maxCols
        },
        columns,
        rows
    });
};

module.exports = {
    getRowData,
    getFilteredFiles,
    consoleDetailsReport
};
