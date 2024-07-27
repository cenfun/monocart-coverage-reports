const CG = require('console-grid');
const EC = require('eight-colors');
const Util = require('../utils/util.js');

const nFormatter = (v) => {
    if (typeof v === 'number') {
        return Util.NF(v);
    }
    return v;
};


const getSummaryColumns = (color) => {

    const columns = [{
        id: 'name',
        name: 'Name'
    }, {
        id: 'pct',
        name: 'Coverage %',
        align: 'right',
        formatter: (v, row, column) => {
            if (typeof v === 'number') {
                return Util.getColorStrByStatus(Util.PSF(v, 100, 2), row.status, color);
            }
            return v;
        }
    }, {
        id: 'covered',
        name: 'Covered',
        align: 'right',
        formatter: nFormatter
    }, {
        id: 'uncovered',
        name: 'Uncovered',
        align: 'right',
        formatter: nFormatter
    }, {
        id: 'total',
        name: 'Total',
        align: 'right',
        formatter: nFormatter
    }];

    return columns;
};

const consoleSummaryReport = (reportData, reportOptions, options) => {

    const csOptions = {
        metrics: [],
        ... reportOptions
    };

    const {
        summary, name, type
    } = reportData;

    if (name) {
        Util.logInfo(EC.cyan(name));
    }

    const metrics = Util.getMetrics(csOptions.metrics, type);

    const rows = metrics.map((k) => {
        return {
            ... summary[k],
            name: Util.capitalizeFirstLetter(k)
        };
    });

    const columns = getSummaryColumns('ansicode');

    CG({
        columns,
        rows
    });
};

module.exports = {
    getSummaryColumns,
    consoleSummaryReport
};
