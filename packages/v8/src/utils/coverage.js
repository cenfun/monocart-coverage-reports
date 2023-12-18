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

        // blank lines
        formattedLines.filter((it) => it.blank).forEach((lineInfo) => {
            const lineIndex = lineInfo.line;
            this.uncoveredLines[lineIndex] = 'blank';
        });

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
                if (line) {
                    line.comment = true;
                }
            });

        });

        formattedLines.filter((it) => it.comment).forEach((lineInfo) => {
            const lineIndex = lineInfo.line;
            this.uncoveredLines[lineIndex] = 'comment';
        });

        if (item.type === 'js') {
            this.parseJs(item.ranges);
        } else {
            this.parseCss(item.ranges, item.source.length);
        }

        // calculate covered and uncovered after parse


        const values = Object.values(this.uncoveredLines);
        // console.log(values);

        const blank = values.filter((v) => v === 'blank').length;
        this.linesSummary.blank = blank;

        const comment = values.filter((v) => v === 'comment').length;
        this.linesSummary.comment = comment;

        const allCount = formattedLines.length;
        const total = allCount - blank - comment;
        this.linesSummary.total = total;

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
            return prev;
        }
        this.uncoveredLines[line] = value;
    }

    setUncoveredPieces(line, value) {

        // console.log('setUncoveredPieces', line, value);
        const prevList = this.uncoveredPieces[line];
        if (prevList) {
            prevList.push(value);
            return;
        }
        this.uncoveredPieces[line] = [value];
    }

    setSingleLine(sLoc, eLoc) {
        // console.log(sLoc, eLoc);

        // nothing between
        if (sLoc.column >= eLoc.column) {
            return;
        }

        // console.log(sLoc, codeOffset, eLoc);

        if (sLoc.column === sLoc.indent && eLoc.column === eLoc.length) {
            // console.log('single', sLoc.line);
            this.setUncoveredLine(sLoc.line, 'uncovered');
            return;
        }

        // should be multiple partials in a line, like minified js
        this.setUncoveredLine(sLoc.line, 'partial');

        // set pieces for partial, only js
        this.setUncoveredPieces(sLoc.line, {
            start: sLoc.column,
            end: eLoc.column
        });

    }

    setMultipleLines(sLoc, eLoc) {

        const firstELoc = {
            ... sLoc,
            column: sLoc.length
        };
        this.setSingleLine(sLoc, firstELoc);

        for (let i = sLoc.line + 1; i < eLoc.line; i++) {
            this.setUncoveredLine(i, 'uncovered');
        }

        const lastSLoc = {
            ... eLoc,
            column: eLoc.indent
        };
        this.setSingleLine(lastSLoc, eLoc);

    }

    // ====================================================================================================

    setUncoveredRangeLines(start, end) {

        // console.log('setUncoveredRangeLines', start, end);

        const mapping = this.mapping;
        const skipIndent = true;
        const sLoc = mapping.getFormattedLocation(start, skipIndent);
        const eLoc = mapping.getFormattedLocation(end, skipIndent);

        // const lines = Util.getRangeLines(sLoc, eLoc);
        // console.log(lines);

        if (eLoc.line === sLoc.line) {
            this.setSingleLine(sLoc, eLoc);
            return;
        }

        this.setMultipleLines(sLoc, eLoc);
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

