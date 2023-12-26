// https://playwright.dev/docs/api/class-coverage

// url, text, ranges: [ {start, end} ]
const getCssSummaryBytes = (item) => {

    const source = item.source;
    const total = source.length;

    let covered = 0;
    const bytes = item.data.bytes;
    if (bytes) {
        bytes.forEach((range) => {
            covered += range.end - range.start;
        });
    }

    // no functions for css
    return {
        total,
        covered
    };

};

// url, source, ranges:[{start,end, count}]
const getJsSummaryBytes = (item) => {

    const source = item.source;
    const total = source.length;

    const uncoveredBytes = item.data.bytes.filter((range) => range.count === 0);

    let uncovered = 0;

    let endPos = 0;
    uncoveredBytes.forEach((range) => {
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

const getV8SummaryBytes = (item) => {
    if (item.type === 'css') {
        return getCssSummaryBytes(item);
    }
    return getJsSummaryBytes(item);
};

module.exports = {
    getV8SummaryBytes
};
