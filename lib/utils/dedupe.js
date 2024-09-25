/**
 * The ranges are first ordered by ascending `startOffset` and then by descending `endOffset`.
 * This corresponds to a pre-order tree traversal.
 */

const sortRanges = (ranges) => {
    ranges.sort((a, b) => {
        if (a.start === b.start) {
            return b.end - a.end;
        }
        return a.start - b.start;
    });
};

const filterRanges = (ranges) => {
    // remove start = end
    return ranges.filter((range) => range.start < range.end);
};

// apply directly to css ranges
const dedupeFlatRanges = (ranges) => {

    ranges = filterRanges(ranges);

    if (ranges.length < 2) {
        return ranges;
    }

    sortRanges(ranges);

    ranges.reduce((prevRange, range) => {

        // same start
        if (range.start === prevRange.start) {
            range.dedupe = true;
            // equal prev
            if (range.end === prevRange.end) {
                return prevRange;
            }

            // less than prev end after new sort

            return prevRange;
        }

        // already in the range
        if (range.end <= prevRange.end) {
            range.dedupe = true;
            return prevRange;
        }

        // collected, update the end
        if (range.start <= prevRange.end) {
            range.dedupe = true;
            prevRange.end = range.end;
            return prevRange;
        }

        return range;
    });

    ranges = ranges.filter((it) => !it.dedupe);

    return ranges;
};

const mergeRangesWith = (ranges, comparer, handler) => {

    // ranges format
    // { start: 0, end: 6, ... }

    ranges = filterRanges(ranges);

    if (ranges.length < 2) {
        return ranges;
    }

    sortRanges(ranges);

    let hasDedupe = false;

    // merge count for same range
    ranges.reduce((lastRange, range) => {
        if (comparer(lastRange, range)) {
            range.dedupe = true;

            handler(lastRange, range);

            hasDedupe = true;

            return lastRange;
        }
        return range;
    });

    if (hasDedupe) {
        // console.log(ranges);
        ranges = ranges.filter((it) => !it.dedupe);
    }

    // console.log('ranges length after', ranges.length);

    return ranges;
};

// apply to js count ranges
const dedupeCountRanges = (ranges) => {
    const comparer = (lastRange, range) => {
        return lastRange.start === range.start && lastRange.end === range.end;
    };
    const handler = (lastRange, range) => {
        lastRange.count += range.count;
    };
    return mergeRangesWith(ranges, comparer, handler);
};


module.exports = {
    sortRanges,
    dedupeFlatRanges,
    mergeRangesWith,
    dedupeCountRanges
};
