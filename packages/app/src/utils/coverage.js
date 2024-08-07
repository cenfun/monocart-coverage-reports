import Util from './util.js';

class CoverageParser {

    constructor(item, state, mappingParser, formattedLocator) {

        this.uncoveredLines = {};
        this.uncoveredPieces = {};
        this.allExecutionCounts = {};

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

        const formattedIgnores = this.getFormattedIgnores(item.data.ignores, mappingParser);

        // blank and comment lines
        const lineMap = new Map();
        let blankCount = 0;
        let commentCount = 0;
        formattedLines.forEach((lineItem) => {
            if (lineItem.blank) {
                this.uncoveredLines[lineItem.line] = 'blank';
                blankCount += 1;
                return;
            }
            if (lineItem.comment) {
                this.uncoveredLines[lineItem.line] = 'comment';
                commentCount += 1;
            }
            // 1-base
            const line = lineItem.line + 1;

            Util.initLineCoverage(lineItem);

            // need set `ignore` line, and will add ignoredCount
            lineItem.ignored = this.isLineIgnored(lineItem, formattedIgnores);

            lineMap.set(line, lineItem);
        });

        // do NOT use type, it could be ts or vue for source file
        if (item.js) {
            this.parseJs(item.data, lineMap);
        } else {
            this.parseCss(item.data, lineMap);
        }

        this.updateLinesInfo(lineMap);

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
        this.linesSummary.skip = ignoredCount;

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

        const decorations = this.getDecorations(item.data.branches);

        this.coverage = {
            // required for code viewer
            uncoveredLines: this.uncoveredLines,
            uncoveredPieces: this.uncoveredPieces,
            allExecutionCounts: this.allExecutionCounts,
            decorations,
            // updated lines summary after formatted
            linesSummary: this.linesSummary
        };

    }

    getFormattedIgnores(ignoredRanges, mappingParser) {

        // the start and end is formatted position
        // the ignoredRanges is original positions, requires updating to formatted positions too
        // could be /r/n to /n only
        if (ignoredRanges) {
            return ignoredRanges.map((it) => {
                const start = mappingParser.originalToFormatted(it.start);
                const end = mappingParser.originalToFormatted(it.end);
                return {
                    start,
                    end
                };
            });
        }

    }

    isLineIgnored(lineItem, formattedIgnores) {
        if (formattedIgnores) {
            const found = Util.findInRanges(lineItem.start, lineItem.end, formattedIgnores);
            if (found) {
                return true;
            }
        }
        return false;
    }

    // ====================================================================================================

    // css, ranges: [ {start, end} ]
    parseCss(data, lineMap) {
        const bytes = data.bytes;
        if (!bytes.length) {
            return;
        }

        bytes.forEach((range) => {
            const { count, ignored } = range;

            if (ignored) {
                return;
            }

            if (count === 0) {
                // set uncovered first
                this.setUncoveredRangeLines(range, lineMap);
            }

        });

    }

    // js, source, ranges: [ {start, end, count} ]
    parseJs(data, lineMap) {

        const bytes = data.bytes;
        // no ranges mark all as covered
        if (!bytes.length) {
            return;
        }

        bytes.forEach((range) => {
            const { count, ignored } = range;

            if (ignored) {
                return;
            }

            if (count > 0) {
                if (count > 1) {
                    this.setExecutionCounts(range);
                }
            } else {
                // set uncovered first, then could be changed to ignored if uncovered
                this.setUncoveredRangeLines(range, lineMap);
            }
        });

    }

    updateLinesInfo(lineMap) {

        // console.log(lineMap);

        lineMap.forEach((lineItem) => {
            const {
                ignored, uncoveredEntire, uncoveredPieces, coveredCount
            } = lineItem;

            const index = lineItem.line;
            if (ignored) {
                // could be comment already
                this.setUncoveredLine(index, 'ignored');
                return;
            }

            if (uncoveredEntire) {
                this.setUncoveredLine(index, 'uncovered');
                lineItem.count = 0;
                return;
            }

            // has covered
            lineItem.count = coveredCount;

            // only uncovered
            const uncoveredLen = uncoveredPieces.length;
            if (uncoveredLen === 0) {
                return;
            }

            // pieces uncovered
            this.setUncoveredLine(index, 'partial');
            uncoveredPieces.forEach((it) => {
                const { pieces } = it;
                if (!pieces) {
                    console.log('not found pieces', uncoveredPieces);
                    return;
                }
                this.setUncoveredPieces(index, pieces);
            });

        });

    }

    setUncoveredRangeLines(range, lineMap) {

        // already ignored
        const {
            start, end, count
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
        Util.updateLinesCoverage(lines, count, lineMap);

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

    // only for js, and count > 1
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
        const column = sLoc.column;

        const eLoc = locator.offsetToLocation(formattedEnd);
        let endPos = eLoc.start;
        if (eLoc.column > eLoc.indent) {
            endPos += eLoc.column;
        }

        const execution = {
        // for start position
            column,
            // number
            count,
            // formatted number
            value: Util.CF(count),
            // for end position
            end: endPos
        };

        // console.log(formattedStart, formattedEnd, sLoc);

        const prevList = this.allExecutionCounts[index];
        if (prevList) {
            prevList.push(execution);
            return;
        }
        this.allExecutionCounts[index] = [execution];
    }

    getDecorations(branches) {

        const uncoveredNoneBranches = branches.filter((it) => it.none && it.count === 0 && !it.ignored);

        const decorations = {};

        const mappingParser = this.mappingParser;
        const locator = this.formattedLocator;

        uncoveredNoneBranches.forEach((it) => {

            // shows before start position
            // end position could be imprecise, for example not found "}" when minify
            const formattedOffset = mappingParser.originalToFormatted(it.start);

            const eLoc = locator.offsetToLocation(formattedOffset);
            const column = Math.max(eLoc.column, eLoc.indent);

            // to index 0-base
            const index = eLoc.line - 1;

            const decoration = {
                column,
                value: 'E',
                className: 'mcr-uncovered-else',
                attrs: {
                    title: 'else path uncovered'
                }
            };

            const prevList = decorations[index];
            if (prevList) {
                prevList.push(decoration);
                return;
            }
            decorations[index] = [decoration];
        });

        // Ranges must be added sorted by `from` position and `startSide`
        // requires sort by column
        Object.keys(decorations).forEach((index) => {
            const list = decorations[index];
            if (list.length > 1) {
                list.sort((a, b) => {
                    return a.column - b.column;
                });
            }
        });

        return decorations;
    }
}

export const getCoverage = (item, state, mappingParser, formattedLocator) => {
    const parser = new CoverageParser(item, state, mappingParser, formattedLocator);
    return parser.coverage;
};

