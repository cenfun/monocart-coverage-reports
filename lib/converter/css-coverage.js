const getCssRangePoints = (groups) => {
    const points = [];
    groups.forEach((ranges) => {
        ranges.forEach(({
            start, end, count
        }) => {
            if (start >= end) {
                return;
            }
            const covered = count > 0 ? 1 : 0;
            const uncovered = count > 0 ? 0 : 1;
            points.push({
                offset: start, covered, uncovered
            }, {
                offset: end, covered: -covered, uncovered: -uncovered
            });
        });
    });
    return points.sort((a, b) => a.offset - b.offset);
};

const appendCssRange = (merged, start, end, count) => {
    const last = merged[merged.length - 1];
    if (last && last.end === start && last.count === count) {
        last.end = end;
    } else {
        merged.push({
            start, end, count
        });
    }
};

const sweepCssBytes = (groups, uncoveredWins) => {
    const points = getCssRangePoints(groups);
    const merged = [];
    let start = 0;
    let covered = 0;
    let uncovered = 0;
    for (const point of points) {
        const end = point.offset;
        if (start < end && (covered > 0 || uncovered > 0)) {
            const count = uncoveredWins ? Number(uncovered === 0) : Number(covered > 0);
            appendCssRange(merged, start, end, count);
        }
        covered += point.covered;
        uncovered += point.uncovered;
        start = end;
    }
    return merged;
};

const isSortedDisjoint = (ranges) => {
    let end = -Infinity;
    for (const range of ranges) {
        if (!(range.start >= end && range.start < range.end)) {
            return false;
        }
        end = range.end;
    }
    return true;
};

// Within one bundle an uncovered child overrides its covered wrapper. Only
// after that interpretation may coverage from separate bundles be unioned.
// Unmapped gaps stay absent from this union; this function does not turn them
// into covered ranges. Byte summaries still derive covered bytes from total
// length minus explicit uncovered ranges, so gaps without an uncovered range
// are reported as covered. Use the line/code views when gaps matter.
const mergeCssBytes = (groups) => {
    // Ordered, disjoint ranges already have unambiguous per-bundle coverage.
    // Reuse them without allocating intermediate events and normalized ranges.
    const normalized = groups.map((ranges) => (isSortedDisjoint(ranges) ? ranges : sweepCssBytes([ranges], true)));
    return sweepCssBytes(normalized, false);
};

export { mergeCssBytes };
