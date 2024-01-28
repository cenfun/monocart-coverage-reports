const Util = require('../utils/util.js');

const quickFindRange = (position, ranges, startKey, endKey) => {
    let start = 0;
    let end = ranges.length - 1;
    while (end - start > 1) {
        const i = Math.floor((start + end) * 0.5);
        const item = ranges[i];
        if (position < item[startKey]) {
            end = i;
            continue;
        }
        if (position > item[endKey]) {
            start = i;
            continue;
        }
        return ranges[i];
    }
    // last two items, less is start
    const endItem = ranges[end];
    if (position < endItem[startKey]) {
        return ranges[start];
    }
    return ranges[end];
};


const findInRanges = (start, end, ranges, startKey = 'startOffset', endKey = 'endOffset') => {
    if (!Util.isList(ranges)) {
        return;
    }
    const range = quickFindRange(start, ranges, startKey, endKey);
    if (start >= range[startKey] && end <= range[endKey]) {
        return range;
    }
};


module.exports = findInRanges;
