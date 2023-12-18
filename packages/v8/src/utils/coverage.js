import { Mapping } from 'monocart-formatter';
import Util from './util.js';

class CoverageParser {

    constructor(item, state, formattedContent, formattedMapping) {

        this.uncoveredLines = {};
        this.uncoveredPieces = {};
        this.executionCounts = {};

        // parse comment and blank lines, include vue html for now
        const mapping = new Mapping(formattedContent, formattedMapping);
        this.mapping = mapping;

        const formattedLines = mapping.formattedLines;

        this.linesSummary = {
            covered: 0,
            uncovered: 0,
            total: 0,
            pct: 0,
            status: '',
            blank: 0,
            comment: 0
        };

        // comments: original comment ranges { block, start, end }
        const comments = item.comments;
        comments.forEach((range) => {
            const {
                block, start, end
            } = range;
            const sLoc = mapping.getFormattedLocation(start);
            const eLoc = mapping.getFormattedLocation(end);

            const lines = Util.getRangeLines(sLoc, eLoc, block);

            lines.forEach((it) => {
                if (!it.entire) {
                    return;
                }
                const line = formattedLines[it.line];
                // blank in block comment count as blank
                if (line && !line.blank) {
                    line.comment = true;
                }
            });

        });

        // blank and comment lines
        let blankCount = 0;
        let commentCount = 0;
        formattedLines.forEach((it) => {
            if (it.blank) {
                this.uncoveredLines[it.line] = 'blank';
                blankCount += 1;
                return;
            }
            if (it.comment) {
                this.uncoveredLines[it.line] = 'comment';
                commentCount += 1;
            }

        });

        if (item.type === 'js') {
            this.parseJs(item.ranges);
        } else {
            this.parseCss(item.ranges, item.source.length);
        }

        // calculate covered and uncovered after parse

        this.linesSummary.blank = blankCount;
        this.linesSummary.comment = commentCount;

        const allCount = formattedLines.length;
        const total = allCount - blankCount - commentCount;
        this.linesSummary.total = total;

        const values = Object.values(this.uncoveredLines);
        // console.log(values);
        const covered = allCount - values.length;

        this.linesSummary.covered = covered;
        this.linesSummary.uncovered = total - covered;

        let pct = '';
        let status = 'unknown';

        if (total) {
            pct = Util.PNF(covered, total, 2);
            status = Util.getStatus(pct, state.watermarks.lines);
        }

        this.linesSummary.pct = pct;
        this.linesSummary.status = status;

        this.coverage = {
            // required for code viewer
            uncoveredLines: this.uncoveredLines,
            uncoveredPieces: this.uncoveredPieces,
            executionCounts: this.executionCounts,

            // updated lines summary after formatted
            linesSummary: this.linesSummary
        };

    }

    // ====================================================================================================

    getUncoveredFromCovered(ranges, contentLength) {
        const uncoveredRanges = [];
        if (!ranges.length) {

            // nothing covered
            uncoveredRanges.push({
                start: 0,
                end: contentLength
            });

            return uncoveredRanges;
        }

        ranges.sort((a, b) => a.start - b.start);

        let pos = 0;
        ranges.forEach((range) => {
            if (range.start > pos) {
                uncoveredRanges.push({
                    start: pos,
                    end: range.start
                });
            }
            pos = range.end;
        });

        if (pos < contentLength) {
            uncoveredRanges.push({
                start: pos,
                end: contentLength
            });
        }

        return uncoveredRanges;
    }

    // css, ranges: [ {start, end} ]
    parseCss(ranges, contentLength) {
        const uncoveredRanges = this.getUncoveredFromCovered(ranges, contentLength);
        uncoveredRanges.forEach((range) => {
            const { start, end } = range;
            this.setUncoveredRangeLines(start, end);
        });
    }

    // js, source, ranges: [ {start, end, count} ]
    parseJs(ranges) {

        // no ranges mark all as covered
        if (!ranges.length) {
            return;
        }

        ranges.forEach((range) => {
            const {
                start, end, count
            } = range;
            if (count > 0) {
                if (count > 1) {
                    this.setExecutionCounts(start, end, count);
                }
            } else {
                // set uncovered first
                this.setUncoveredRangeLines(start, end);
            }
        });

    }

    // ====================================================================================================

    setUncoveredLine(line, value) {
        const prev = this.uncoveredLines[line];
        if (prev) {
            // maybe already blank or comment
            return;
        }
        this.uncoveredLines[line] = value;
    }

    setUncoveredPieces(line, value) {
        const prevList = this.uncoveredPieces[line];
        if (prevList) {
            prevList.push(value);
            return;
        }
        this.uncoveredPieces[line] = [value];
    }

    // ====================================================================================================

    setUncoveredRangeLines(start, end) {

        // console.log('setUncoveredRangeLines', start, end);

        const mapping = this.mapping;
        const skipIndent = true;
        const sLoc = mapping.getFormattedLocation(start, skipIndent);
        const eLoc = mapping.getFormattedLocation(end, skipIndent);

        // location line is 0 based

        const lines = Util.getRangeLines(sLoc, eLoc);
        // console.log(lines);

        lines.forEach((it) => {
            // whole line
            if (it.entire) {
                this.setUncoveredLine(it.line, 'uncovered');
                return;
            }

            this.setUncoveredLine(it.line, 'partial');
            // set pieces for partial, only js
            this.setUncoveredPieces(it.line, it.range);

        });

    }

    // ====================================================================================================

    // only for js
    setExecutionCounts(start, end, count) {

        const mapping = this.mapping;

        const skipIndent = true;
        const sLoc = mapping.getFormattedLocation(start, skipIndent);
        const line = sLoc.line;
        let column = sLoc.column;

        // It should never be possible to start with }
        const pos = sLoc.start + column;
        const char = mapping.getFormattedSlice(pos, pos + 1);
        if (char === '}') {
        // console.log(line, char);
            column += 1;
        }

        const eLoc = mapping.getFormattedLocation(end, skipIndent);
        let endPos = eLoc.start;
        if (eLoc.column > eLoc.indent) {
            endPos += eLoc.column;
        }

        // console.log(start, end, sLoc);

        const execution = {
        // for start position
            column,
            value: count,
            // for end position
            end: endPos
        };

        const prevList = this.executionCounts[line];
        if (prevList) {
            prevList.push(execution);
            return;
        }
        this.executionCounts[line] = [execution];
    }
}

export const getCoverage = (item, state, formattedContent, formattedMapping) => {
    const parser = new CoverageParser(item, state, formattedContent, formattedMapping);
    return parser.coverage;
};

