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
            this.parseCss(item.ranges, item.source.length, mappingParser, formattedLocator);
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

            // for locate
            uncoveredPositions: this.uncoveredPositions,

            // updated lines summary after formatted
            linesSummary: this.linesSummary
        };

    }

    // ====================================================================================================

    getUncoveredFromCovered(ranges, contentLength) {
        const uncoveredList = [];
        if (!ranges.length) {

            // nothing covered
            uncoveredList.push({
                start: 0,
                end: contentLength
            });

            return uncoveredList;
        }

        ranges.sort((a, b) => a.start - b.start);

        let pos = 0;
        ranges.forEach((range) => {
            if (range.start > pos) {
                uncoveredList.push({
                    start: pos,
                    end: range.start
                });
            }
            pos = range.end;
        });

        if (pos < contentLength) {
            uncoveredList.push({
                start: pos,
                end: contentLength
            });
        }

        return uncoveredList;
    }

    // css, ranges: [ {start, end} ]
    parseCss(ranges, contentLength, mappingParser, formattedLocator) {
        const uncoveredList = this.getUncoveredFromCovered(ranges, contentLength);

        const uncoveredPositions = [];
        uncoveredList.forEach((range) => {
            const uncoveredLines = this.setUncoveredRangeLines(range);

            // no blank and comments
            if (!uncoveredLines.length) {
                return;
            }

            let uncoveredPos = range.start;
            // fix uncovered range for css
            // let uncoveredRange;
            const firstItem = uncoveredLines[0];
            const lineInfo = formattedLocator.getLine(firstItem.line);
            // console.log(firstItem, lineInfo);
            if (lineInfo) {
                if (firstItem.entire) {
                    // getLine 1-base
                    uncoveredPos = lineInfo.start + lineInfo.indent;
                } else {
                    // partial
                    uncoveredPos = lineInfo.start + firstItem.range.start;
                }
            }
            // to original pos
            uncoveredPos = mappingParser.formattedToOriginal(uncoveredPos);

            // filter blank and comments lines
            uncoveredPositions.push(uncoveredPos);

        });

        this.uncoveredPositions = uncoveredPositions;
    }

    // js, source, ranges: [ {start, end, count} ]
    parseJs(ranges) {

        this.uncoveredPositions = [];

        // no ranges mark all as covered
        if (!ranges.length) {
            return;
        }

        ranges.forEach((range) => {
            const { count } = range;

            if (count > 0) {
                if (count > 1) {
                    this.setExecutionCounts(range);
                }
            } else {
                this.uncoveredPositions.push(range.start);
                // set uncovered first
                this.setUncoveredRangeLines(range);
            }
        });

    }

    // ====================================================================================================

    setUncoveredLine(line, value) {
        const prev = this.uncoveredLines[line];
        if (prev) {
            // maybe already blank or comment
            return true;
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

    setUncoveredRangeLines(range) {

        const { start, end } = range;

        const mappingParser = this.mappingParser;
        const formattedStart = mappingParser.originalToFormatted(start);
        const formattedEnd = mappingParser.originalToFormatted(end);

        const locator = this.formattedLocator;
        const sLoc = locator.offsetToLocation(formattedStart);
        const eLoc = locator.offsetToLocation(formattedEnd);

        // location line is 0 based

        const lines = Util.getRangeLines(sLoc, eLoc);
        // console.log(lines);

        // uncovered lines without blank and comment lines for css
        const uncoveredLines = [];

        lines.forEach((it) => {

            // to index 0-base
            const index = it.line - 1;

            // whole line
            if (it.entire) {
                const prev = this.setUncoveredLine(index, 'uncovered');

                // prev blank or comment
                if (!prev) {
                    uncoveredLines.push(it);
                }

                return;
            }

            this.setUncoveredLine(index, 'partial');
            // set pieces for partial, only js
            this.setUncoveredPieces(index, it.range);
            uncoveredLines.push(it);

        });

        return uncoveredLines;
    }

    // ====================================================================================================

    // only for js
    setExecutionCounts(range) {

        const {
            start, end, count
        } = range;

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

