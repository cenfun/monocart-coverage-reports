// both css and js
const getV8SummaryBytes = (item) => {
    const source = item.source;
    const total = source.length;

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

module.exports = {
    getV8SummaryBytes
};
