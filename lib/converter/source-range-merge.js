// Each group belongs to one source-file merge and is immutable while queried.
// Weak keys keep indices from retaining coverage after that merge finishes.
const rangeIndices = new WeakMap();
const mappingIndices = new WeakMap();
const mappingScanLimit = 32;

const createRangeIndex = (groupMap) => {
    // Copy before sorting: custom group order must not be changed.
    const ranges = Array.from(groupMap.values()).sort((a, b) => a.start - b.start);
    const starts = new Float64Array(ranges.length);
    const maxEnds = new Float64Array(ranges.length);
    let maxEnd = -Infinity;
    for (let i = 0; i < ranges.length; i++) {
        starts[i] = ranges[i].start;
        maxEnd = Math.max(maxEnd, ranges[i].end);
        maxEnds[i] = maxEnd;
    }
    return {
        starts, maxEnds
    };
};

const containsRange = (group, start, end) => {
    let index = rangeIndices.get(group);
    if (!index) {
        index = createRangeIndex(group.groupMap);
        rangeIndices.set(group, index);
    }
    const { starts, maxEnds } = index;
    let low = 0;
    let high = starts.length;
    // The prefix ending at low contains every possible enclosing range.
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (starts[mid] <= start) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low > 0 && maxEnds[low - 1] >= end;
};

const scanMappingPrefix = (mappings, start, end) => {
    const limit = Math.min(mappingScanLimit, mappings.length);
    for (let i = 0; i < limit; i++) {
        const offset = mappings[i].originalOffset;
        if (offset >= start && offset <= end) {
            return true;
        }
    }
    // A short list was exhausted; otherwise the answer is still unknown.
    return mappings.length <= limit ? false : null;
};

const hasMapping = (group, start, end) => {
    let offsets = mappingIndices.get(group);
    if (!offsets) {
        const mappings = group.state.decodedMappings;
        // Early hits (or exhausted short lists) need no full copy/sort. Probe
        // only a bounded prefix so many misses cannot become quadratic scans.
        const match = scanMappingPrefix(mappings, start, end);
        if (match !== null) {
            return match;
        }
        // Sort a separate numeric index, not the shared decoded mappings. The
        // upstream order is by line/column; malformed columns can produce
        // non-monotonic offsets, so do not assume offset order here.
        offsets = Float64Array.from(mappings, (item) => item.originalOffset).sort();
        mappingIndices.set(group, offsets);
    }
    let low = 0;
    let high = offsets.length;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (offsets[mid] < start) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    // Preserve the old inclusive endpoints, including a mapping at range.end.
    return low < offsets.length && offsets[low] <= end;
};

const isUncoveredRange = (range, key, uncoveredGroups) => {
    for (const group of uncoveredGroups) {
        if (group.groupMap.has(key)) {
            continue;
        }
        if (containsRange(group, range.start, range.end)) {
            continue;
        }
        if (hasMapping(group, range.start, range.end)) {
            // Another group maps this range without marking it uncovered.
            // No later group can change that decision.
            return false;
        }
    }
    return true;
};

export { isUncoveredRange };
