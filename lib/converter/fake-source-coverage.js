const rangeKey = (range) => `${range.start}_${range.end}`;

const handleUncoveredInCovered = (state, originalStateMap) => {
    if (!state.fake) {
        return;
    }

    originalStateMap.forEach((originalState) => {
        const { bytes } = originalState;
        // The old check treats every non-zero count as covered, not just > 0.
        const covered = bytes.filter((range) => range.count !== 0);
        if (!covered.length || covered.length === bytes.length) {
            originalState.bytes = bytes.slice();
            return;
        }

        // Sort a separate array so byte order and original range objects stay
        // unchanged. Prefix maxima also handle nested/overlapping coverage.
        covered.sort((a, b) => a.start - b.start);
        const starts = new Float64Array(covered.length);
        const maxEnds = new Float64Array(covered.length);
        let maxEnd = -Infinity;
        for (let i = 0; i < covered.length; i++) {
            starts[i] = covered[i].start;
            maxEnd = Math.max(maxEnd, covered[i].end);
            maxEnds[i] = maxEnd;
        }

        const removed = new Set();
        originalState.bytes = bytes.filter((range) => {
            if (range.count !== 0) {
                return true;
            }
            let low = 0;
            let high = starts.length;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                // Preserve the original inclusive overlap test: touching
                // endpoints count as overlap even though ranges are half-open.
                if (starts[mid] <= range.end) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            if (low > 0 && maxEnds[low - 1] >= range.start) {
                removed.add(rangeKey(range));
                return false;
            }
            return true;
        });

        if (!removed.size) {
            return;
        }
        // Remove exact start/end matches, not every overlapping AST range.
        // Each metadata array is filtered once, regardless of removal count.
        for (const key of ['statements', 'branches', 'functions']) {
            originalState[key] = originalState[key].filter((range) => !removed.has(rangeKey(range)));
        }
    });
};

export { handleUncoveredInCovered };
