const Util = require('../utils/util.js');

// both css and js
const getV8SummaryBytes = (item) => {
    const source = item.source;
    const total = source.length;

    // for empty coverage
    if (item.empty) {
        return {
            total,
            covered: 0
        };
    }

    const uncoveredBytes = item.data.bytes.filter((range) => range.count === 0);

    let uncovered = 0;

    let endPos = 0;
    uncoveredBytes.forEach((range) => {
        if (range.ignored) {
            return;
        }

        const { start, end } = range;

        if (start > endPos) {
            uncovered += end - start;
            endPos = end;
            return;
        }

        if (end <= endPos) {
            return;
        }

        uncovered += end - endPos;
        endPos = end;

    });

    const covered = total - uncovered;

    // console.log(item)

    return {
        total,
        covered
    };
};

// calculate uncovered, pct, status
const calculatePctAndStatus = (item, watermarks) => {
    Object.keys(item).forEach((k) => {
        const indicateData = item[k];
        indicateData.uncovered = indicateData.total - indicateData.covered;

        let pct = '';
        let status = 'unknown';

        if (indicateData.total) {
            pct = Util.PNF(indicateData.covered, indicateData.total, 2);
            status = Util.getStatus(pct, watermarks[k]);
        }

        indicateData.pct = pct;
        indicateData.status = status;

    });
};

const getV8Summary = (v8list, watermarks) => {

    // get bytes summary
    v8list.forEach((entry) => {
        entry.summary.bytes = getV8SummaryBytes(entry);
    });

    // overall summary
    const summary = {
        bytes: {
            total: 0,
            covered: 0
        },
        statements: {
            total: 0,
            covered: 0
        },
        branches: {
            total: 0,
            covered: 0
        },
        functions: {
            total: 0,
            covered: 0
        },
        lines: {
            total: 0,
            covered: 0,
            blank: 0,
            comment: 0
        }
    };

    v8list.forEach((entry) => {
        const entrySummary = entry.summary;
        calculatePctAndStatus(entrySummary, watermarks);

        // do NOT add debug file
        if (entry.debug) {
            return;
        }

        Object.keys(entrySummary).forEach((k) => {
            const indicateData = entrySummary[k];
            if (!indicateData) {
                return;
            }
            summary[k].total += indicateData.total;
            summary[k].covered += indicateData.covered;

            if (k === 'lines') {
                summary[k].blank += indicateData.blank;
                summary[k].comment += indicateData.comment;
            }
        });
    });

    // calculate overall summary
    calculatePctAndStatus(summary, watermarks);

    return summary;
};

module.exports = {
    getV8Summary
};
