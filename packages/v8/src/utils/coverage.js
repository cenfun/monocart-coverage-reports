import Util from './util.js';

class CoverageParser {

    constructor(item, state, mappingParser, formattedLocator) {

        this.uncoveredLines = {};
        this.uncoveredPieces = {};
        this.executionCounts = {};

        // parse comment and blank lines, include vue html for now
        this.mappingParser = mappingParser;
        this.formattedLocator = formattedLocator;

        const formattedLines = formattedLocator.lines;

        this.linesSummary = {
            covered: 0,
            uncovered: 0,
            total: 0,
            pct: 0,
            status: '',
            blank: 0,
            comment: 0
        };

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

        // do NOT use type, it could be ts or vue for source file
        if (item.js) {
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

        const mappingParser = this.mappingParser;
        const formattedStart = mappingParser.originalToFormatted(start);
        const formattedEnd = mappingParser.originalToFormatted(end);

        const locator = this.formattedLocator;
        const sLoc = locator.offsetToLocation(formattedStart);
        const eLoc = locator.offsetToLocation(formattedEnd);

        // location line is 0 based

        const lines = Util.getRangeLines(sLoc, eLoc);
        // console.log(lines);

        lines.forEach((it) => {

            // to index 0-base
            const index = it.line - 1;

            // whole line
            if (it.entire) {
                this.setUncoveredLine(index, 'uncovered');
                return;
            }

            this.setUncoveredLine(index, 'partial');
            // set pieces for partial, only js
            this.setUncoveredPieces(index, it.range);

        });

    }

    // ====================================================================================================

    // only for js
    setExecutionCounts(start, end, count) {

        // console.log('setExecutionCounts', start, end, count);

        const mappingParser = this.mappingParser;
        const formattedStart = mappingParser.originalToFormatted(start);
        const formattedEnd = mappingParser.originalToFormatted(end);

        const locator = this.formattedLocator;

        // 1-base
        const sLoc = locator.offsetToLocation(formattedStart);

        // to index 0-base
        const index = sLoc.line - 1;

        // fix column
        let column = Math.max(sLoc.column, sLoc.indent);
        // It should never be possible to start with }
        const pos = sLoc.start + column;
        const char = locator.getSlice(pos, pos + 1);
        if (char === '}') {
        // console.log(line, char);
            column += 1;
        }

        const eLoc = locator.offsetToLocation(formattedEnd);
        let endPos = eLoc.start;
        if (eLoc.column > eLoc.indent) {
            endPos += eLoc.column;
        }

        const execution = {
        // for start position
            column,
            value: count,
            // for end position
            end: endPos
        };

        // console.log(formattedStart, formattedEnd, sLoc);

        const prevList = this.executionCounts[index];
        if (prevList) {
            prevList.push(execution);
            return;
        }
        this.executionCounts[index] = [execution];
    }
}

export const getCoverage = (item, state, mappingParser, formattedLocator) => {
    const parser = new CoverageParser(item, state, mappingParser, formattedLocator);
    return parser.coverage;
};

