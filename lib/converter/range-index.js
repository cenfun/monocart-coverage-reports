// AST block arrays are immutable during a visit. Weak keys release the index
// with the array, and rebuilding coverage info creates fresh arrays/indices.
const indices = new WeakMap();
const linearSearchLimit = 16;

const createIndex = (ranges) => {
    // V8 ranges are in start-offset order. Preserve last-in-input semantics for
    // custom, unsorted coverage rather than sorting it and changing the result.
    for (let i = 1; i < ranges.length; i++) {
        if (ranges[i].startOffset < ranges[i - 1].startOffset) {
            return null;
        }
    }

    let size = 1;
    while (size < ranges.length) {
        size *= 2;
    }
    const maxEnds = new Float64Array(size * 2);
    maxEnds.fill(-Infinity);
    for (let i = 0; i < ranges.length; i++) {
        maxEnds[size + i] = ranges[i].endOffset;
    }
    for (let i = size - 1; i > 0; i--) {
        maxEnds[i] = Math.max(maxEnds[i * 2], maxEnds[i * 2 + 1]);
    }
    return {
        size, maxEnds
    };
};

const findRightmost = (maxEnds, node, left, right, limit, end) => {
    if (left >= limit || maxEnds[node] < end) {
        return -1;
    }
    if (right - left === 1) {
        return left;
    }
    const mid = (left + right) / 2;
    const found = findRightmost(maxEnds, node * 2 + 1, mid, right, limit, end);
    if (found !== -1) {
        return found;
    }
    return findRightmost(maxEnds, node * 2, left, mid, limit, end);
};

// Return the last enclosing range, including equal-start ranges. For sorted
// arrays the O(n) index is built once; subsequent queries take O(log n).
const findContainingRange = (ranges, start, end) => {
    if (ranges.length <= linearSearchLimit) {
        return ranges.findLast((range) => range.startOffset <= start && range.endOffset >= end);
    }
    if (!indices.has(ranges)) {
        indices.set(ranges, createIndex(ranges));
    }
    const index = indices.get(ranges);
    if (!index) {
        return ranges.findLast((range) => range.startOffset <= start && range.endOffset >= end);
    }

    // Only the prefix with startOffset <= start can contain the query.
    let low = 0;
    let high = ranges.length;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (ranges[mid].startOffset <= start) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    const found = findRightmost(index.maxEnds, 1, 0, index.size, low, end);
    if (found !== -1) {
        return ranges[found];
    }
};

export { findContainingRange };
