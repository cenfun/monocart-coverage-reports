const Util = require('../utils/util.js');

const quickFindRange = (position, ranges) => {
    let start = 0;
    let end = ranges.length - 1;
    while (end - start > 1) {
        const i = Math.floor((start + end) * 0.5);
        const item = ranges[i];
        if (position < item.startOffset) {
            end = i;
            continue;
        }
        if (position > item.endOffset) {
            start = i;
            continue;
        }
        return ranges[i];
    }
    // last two items, less is start
    const endItem = ranges[end];
    if (position < endItem.startOffset) {
        return ranges[start];
    }
    return ranges[end];
};


const findInRanges = (start, end, ranges) => {
    if (!Util.isList(ranges)) {
        return;
    }
    const range = quickFindRange(start, ranges);
    if (start >= range.startOffset && end <= range.endOffset) {
        return range;
    }
};


module.exports = findInRanges;
