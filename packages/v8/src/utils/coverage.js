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
        const lineMap = new Map();
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
            // 1-base
            const line = it.line + 1;
            lineMap.set(line, it);
        });

        const ignoredList = item.data.ignores;
        if (ignoredList) {
            lineMap.forEach((it) => {
                const ignoredItem = Util.findInRanges(it.start + it.indent, it.end, ignoredList, 'start', 'end');
                if (ignoredItem) {
                    it.ignored = true;
                }
            });
        }

        this.uncoveredInfo = {
            bytes: [],
            functions: [],
            branches: []
        };

        this.ignoredCount = 0;

        // do NOT use type, it could be ts or vue for source file
        if (item.js) {
            this.parseJs(item.data, lineMap);
        } else {
            this.parseCss(item.data, lineMap);
        }

        // calculate covered and uncovered after parse

        this.linesSummary.blank = blankCount;
        this.linesSummary.comment = commentCount;

        const allCount = formattedLines.length;

        // 1, blank, comment, ignored,
        // 2, uncovered
        // 3, partial
        const uncoveredCount = Object.values(this.uncoveredLines).length;
        // 4, covered
        const covered = allCount - uncoveredCount;

        const ignoredCount = Object.values(this.uncoveredLines).filter((it) => it === 'ignored').length;
        const total = allCount - blankCount - commentCount - ignoredCount;
        this.linesSummary.total = total;

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
            uncoveredInfo: this.uncoveredInfo,

            // updated lines summary after formatted
            linesSummary: this.linesSummary
        };

    }

    // ====================================================================================================

    // css, ranges: [ {start, end} ]
    parseCss(data, lineMap) {
        const bytes = data.bytes;
        if (!bytes.length) {
            return;
        }

        const uncoveredBytes = this.uncoveredInfo.bytes;
        bytes.forEach((range) => {
            const {
                start, end, count
            } = range;

            if (count === 0) {
                uncoveredBytes.push({
                    start,
                    end
                });
                // set uncovered first
                this.setUncoveredRangeLines(range, lineMap);
            }

        });

    }

    // js, source, ranges: [ {start, end, count} ]
    parseJs(data, lineMap) {

        const uncoveredBytes = this.uncoveredInfo.bytes;
        const uncoveredFunctions = this.uncoveredInfo.functions;
        const uncoveredBranches = this.uncoveredInfo.branches;

        data.functions.filter((it) => it.count === 0 && !it.ignored).forEach((it) => {
            uncoveredFunctions.push({
                start: it.start,
                end: it.end
            });
        });
        data.branches.filter((it) => it.count === 0 && !it.ignored && !it.none).forEach((it) => {
            uncoveredBranches.push({
                start: it.start,
                end: it.end
            });
        });

        const bytes = data.bytes;
        // no ranges mark all as covered
        if (!bytes.length) {
            return;
        }

        bytes.forEach((range) => {
            const {
                start, end, count, ignored
            } = range;

            if (count > 0) {
                if (count > 1) {
                    this.setExecutionCounts(range);
                }
            } else {
                if (!ignored) {
                    uncoveredBytes.push({
                        start,
                        end
                    });
                }
                // set uncovered first, then could be changed to ignored if uncovered
                this.setUncoveredRangeLines(range, lineMap);
            }
        });

    }

    // ====================================================================================================

    setUncoveredLine(line, value) {
        const prev = this.uncoveredLines[line];
        if (prev) {
            // maybe already blank or comment
            return prev;
        }
        this.uncoveredLines[line] = value;
        return value;
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

    setUncoveredRangeLines(range, lineMap) {

        const {
            start, end, ignored
        } = range;

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
            const line = lineMap.get(it.line);
            if (!line) {
                // not found line, could be comment or blank line
                return;
            }

            // to index 0-base
            const index = it.line - 1;

            // whole line
            if (it.entire) {
                if (ignored) {
                    this.setUncoveredLine(index, 'ignored');
                    this.ignoredCount += 1;
                } else {
                    this.setUncoveredLine(index, 'uncovered');
                }
                return;
            }

            // byte range ignored
            if (ignored) {
                return;
            }

            // pieces could be ignored?

            this.setUncoveredLine(index, 'partial');
            // set pieces for partial, only js
            this.setUncoveredPieces(index, it.pieces);

        });

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

