/**
 * V8 Coverage Data Converter
 * @copyright https://github.com/cenfun/monocart-coverage-reports
 * @author cenfun@gmail.com
 */

const EC = require('eight-colors');

const { Locator } = require('monocart-locator');
const Util = require('../utils/util.js');

const findOriginalRange = require('./find-original-range.js');
const { getJsAstInfo, getCssAstInfo } = require('./ast.js');
const { getIgnoredRanges } = require('./ignore.js');

const { getUntestedList } = require('./untested.js');

const {
    sortRanges, dedupeCountRanges, mergeRangesWith
} = require('../utils/dedupe.js');
const { getSourceType, initSourceMapSourcesPath } = require('../utils/source-path.js');

const { decode } = require('../packages/monocart-coverage-vendor.js');

const InfoBranch = require('./info-branch.js');
const InfoFunction = require('./info-function.js');
const InfoStatement = require('./info-statement.js');

// ========================================================================================================

// debug info
const logMappingErrors = (type, result) => {

    // const {
    //     errors, start, end, sourcePath
    // } = result;
    // // if (!sourcePath.endsWith('monocart-v8.js') || type !== 'byte') {
    // //     return;
    // // }
    // const list = [
    //     Util.EC.red('[Mapping]'),
    //     Util.EC.magenta(type),
    //     errors.join(' -> '),
    //     Util.EC.blue(`${start} ~ ${end}`),
    //     sourcePath
    // ];
    // console.log(list.join(' '));

};

// ========================================================================================================

const handleIgnoredRanges = (list, ignoredRanges) => {
    list.forEach((item) => {
        const range = Util.findInRanges(item.start, item.end, ignoredRanges);
        if (range) {
            // console.log(item, range);
            item.ignored = true;
        }
    });
};


const applyBytesToLines = (bytes, locator, lineMap) => {
    bytes.forEach((range) => {
        const {
            start, end, count, ignored
        } = range;

        // no need handle ignored byte
        if (ignored) {
            return;
        }

        const sLoc = locator.offsetToLocation(start);
        const eLoc = locator.offsetToLocation(end);

        // update lines coverage
        const lines = Util.getRangeLines(sLoc, eLoc);
        Util.updateLinesCoverage(lines, count, lineMap);

    });

    // no ignore items
    lineMap.forEach((lineItem, line) => {

        const {
            uncoveredEntire, uncoveredPieces, coveredCount
        } = lineItem;

        // default count to 1, both js and css
        let count = 1;
        // full covered true/false for entire line
        let covered = true;

        if (uncoveredEntire) {
            count = 0;
            covered = false;
        } else {
            count = coveredCount;
            const uncoveredLen = uncoveredPieces.length;
            if (uncoveredLen > 0) {
                covered = false;
                // uncovered
                count = `1/${uncoveredLen + 1}`;
            }
        }

        lineItem.covered = covered;
        lineItem.count = count;

    });

};

const handleLinesCoverage = (bytes, locator, ignoredRanges) => {

    // init lines
    let blankCount = 0;
    let commentCount = 0;
    const dataExtras = {};
    // line 1 based
    const lineMap = new Map();
    locator.lines.forEach((lineItem) => {
        // line 1-base
        const line = lineItem.line + 1;

        // exclude blank and comment
        if (lineItem.blank) {
            blankCount += 1;
            dataExtras[line] = 'b';
            return;
        }
        if (lineItem.comment) {
            commentCount += 1;
            dataExtras[line] = 'c';
            return;
        }
        const ignored = Util.findInRanges(lineItem.start, lineItem.end, ignoredRanges);
        if (ignored) {
            dataExtras[line] = 'i';
            return;
        }

        Util.initLineCoverage(lineItem);

        lineMap.set(line, lineItem);
    });

    applyBytesToLines(bytes, locator, lineMap);

    const summaryLines = {
        total: 0,
        covered: 0,
        blank: blankCount,
        comment: commentCount
    };
    // data lines
    const dataLines = {};

    // no ignore items
    lineMap.forEach((lineItem, line) => {
        const { count, covered } = lineItem;
        // data lines
        dataLines[line] = count;

        summaryLines.total += 1;
        if (covered) {
            summaryLines.covered += 1;
        }
    });

    return {
        dataLines,
        dataExtras,
        summaryLines
    };
};

// ========================================================================================================

const calculateV8Summary = (list) => {

    const summary = {
        total: 0,
        covered: 0
    };

    list.forEach((item) => {
        if (item.ignored) {
            return;
        }

        summary.total += 1;
        if (item.count > 0) {
            summary.covered += 1;
        }
    });

    return summary;
};

// ========================================================================================================
// istanbul coverage format
// https://github.com/istanbuljs/istanbuljs/blob/master/docs/raw-output.md
/**
 * * `path` - the file path for which coverage is being tracked
 * * `statementMap` - map of statement locations keyed by statement index
 * * `fnMap` - map of function metadata keyed by function index
 * * `branchMap` - map of branch metadata keyed by branch index
 * * `s` - hit counts for statements
 * * `f` - hit count for functions
 * * `b` - hit count for branches
 */
const collectFileCoverage = (v8Data, state, options) => {

    const {
        bytes,
        functions,
        branches,
        statements,

        sourcePath,
        locator
    } = state;

    // ==========================================
    // v8 data
    const data = {
        bytes: dedupeCountRanges(bytes),
        functions: [],
        branches: [],
        statements: []
    };

    // ==========================================
    // ignore
    const ignoredRanges = getIgnoredRanges(locator, options);
    if (ignoredRanges) {

        data.ignores = ignoredRanges;

        // data bytes is start/end/count object
        handleIgnoredRanges(data.bytes, ignoredRanges);

        // functions start/end/count instance
        handleIgnoredRanges(functions, ignoredRanges);

        // branches start/end/count instance
        handleIgnoredRanges(branches, ignoredRanges);

        // branch locations start/end/count object
        branches.forEach((group) => {
            if (group.ignored) {
                // all branch group ignored
                group.locations.forEach((it) => {
                    it.ignored = true;
                });
            } else {
                handleIgnoredRanges(group.locations, ignoredRanges);
            }
        });

        // statements start/end/count instance
        handleIgnoredRanges(statements, ignoredRanges);

        // console.log(ignoredRanges);

    }

    // ==========================================
    // lines
    // after bytes with ignored, before calculateV8Lines
    const {
        dataLines, dataExtras, summaryLines
    } = handleLinesCoverage(data.bytes, locator, ignoredRanges);

    data.lines = dataLines;
    data.extras = dataExtras;

    // console.log('statements', state.sourcePath, statements.length);

    // ==========================================

    data.functions = functions.map((info, i) => {
        return info.getRange(i);
    });
    sortRanges(data.functions);

    // branch group with locations to flat branches
    data.branches = branches.map((info) => {
        return info.getRanges();
    }).flat();
    sortRanges(data.branches);

    data.statements = statements.map((info) => {
        return info.getRange();
    });
    sortRanges(data.statements);

    // ==========================================

    const summary = {
        functions: calculateV8Summary(data.functions),
        branches: calculateV8Summary(data.branches),
        statements: calculateV8Summary(data.statements),
        lines: summaryLines
    };

    // ==========================================
    // v8 data and summary
    v8Data.data = data;
    v8Data.summary = summary;

    // ==========================================
    // istanbul
    const istanbulData = {
        path: sourcePath,

        statementMap: {},
        fnMap: {},
        branchMap: {},

        s: {},
        f: {},
        b: {}
    };

    statements.filter((it) => !it.ignored).forEach((statement, index) => {
        istanbulData.statementMap[`${index}`] = statement.generate(locator);
        istanbulData.s[`${index}`] = statement.count;
    });

    functions.filter((it) => !it.ignored).forEach((fn, index) => {
        istanbulData.fnMap[`${index}`] = fn.generate(locator, index);
        istanbulData.f[`${index}`] = fn.count;
    });

    branches.filter((it) => !it.ignored).forEach((branch, index) => {
        const { map, counts } = branch.generate(locator);
        istanbulData.branchMap[`${index}`] = map;
        istanbulData.b[`${index}`] = counts;
    });

    return istanbulData;

};

// ========================================================================================================

const addJsBytesCoverage = (state, range) => {
    const {
        startOffset, endOffset, count
    } = range;
    // add bytes range
    const byte = {
        start: startOffset,
        // the end could be > source.length
        end: Math.min(endOffset, state.maxContentLength),
        count
    };
    // for debug
    if (Util.isDebug() && state.original) {
        byte.generatedStart = range.generatedStart;
        byte.generatedEnd = range.generatedEnd;
    }
    state.bytes.push(byte);
};

const addCssBytesCoverage = (state, range) => {
    const {
        start, end, count
    } = range;
    // add css bytes range, already start, end
    state.bytes.push({
        start,
        end,
        count
    });
};

// ========================================================================================================

const checkOriginalRangeCode = (range, state, startEndMap, type) => {

    // only for original
    if (!state.original) {
        return true;
    }

    const { start, end } = range;
    if (start >= end) {
        // console.log('invalid branch', state.sourcePath, range);
        return false;
    }

    // could be vue code
    const text = state.locator.getSlice(start, end).trim();
    if (!text) {
        return false;
    }

    // do not check text for `bytes`
    // it could be `} ` uncovered in `try { } catch`
    // instead, use `dedupeCountRanges` to accumulate count
    if (type === 'bytes') {
        return true;
    }

    // invalid original code
    // Matches any character that is not a word character from the basic Latin alphabet.
    // Equivalent to [^A-Za-z0-9_]
    if (text.length === 1 && (/\W/).test(text)) {
        // ; } =
        // console.log(text, type, state.sourcePath, range);
        return false;
    }

    // type: bytes, functions, branches, statements

    // check repeated range
    const key = `${start}_${end}`;
    if (startEndMap.has(key)) {
        return false;
    }
    startEndMap.set(key, range);

    return true;
};

const handleFunctionsCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const startEndMap = new Map();
    const { functions, astInfo } = state;
    astInfo.functions.forEach((it) => {

        if (!checkOriginalRangeCode(it, state, startEndMap, 'functions')) {
            return;
        }

        functions.push(new InfoFunction(it, state.original));
    });

};

const handleBranchesCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const startEndMap = new Map();
    const { branches, astInfo } = state;
    astInfo.branches.forEach((it) => {

        if (!checkOriginalRangeCode(it, state, startEndMap, 'branches')) {
            return;
        }

        branches.push(new InfoBranch(it, state.original));
    });

};

const handleStatementsCoverage = (state) => {

    // statement only for js
    if (!state.js) {
        return;
    }

    const startEndMap = new Map();
    const { statements, astInfo } = state;
    astInfo.statements.forEach((it) => {

        if (!checkOriginalRangeCode(it, state, startEndMap, 'statements')) {
            return;
        }

        statements.push(new InfoStatement(it, state.original));
    });

};

const handleOriginalBytesCoverage = (state) => {
    const startEndMap = new Map();
    state.bytes = state.bytes.filter((it) => {
        return checkOriginalRangeCode(it, state, startEndMap, 'bytes');
    });
};

const handleGeneratedBytesCoverage = (state) => {

    // it could be a dist file, do not handle twice
    if (state.addedGeneratedBytes) {
        return;
    }

    const { js, coverageList } = state;

    if (js) {
        coverageList.forEach((block) => {
            block.ranges.forEach((range) => {

                const { fixedStart, fixedEnd } = Util.fixSourceRange(state.locator, range.startOffset, range.endOffset);
                range.startOffset = fixedStart;
                range.endOffset = fixedEnd;

                addJsBytesCoverage(state, range);
            });
        });
    } else {
        coverageList.forEach((range) => {
            addCssBytesCoverage(state, range);
        });
    }

    state.addedGeneratedBytes = true;

};

// ========================================================================================================

const handleOriginalFunctionsCoverage = (state, originalStateMap) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    // console.log(state.astInfo.functions);

    const updateFunctionBodyRange = (start, end, bodyStart, bodyEnd, originalFunction) => {
        if (bodyStart !== start || bodyEnd !== end) {
            const result = findOriginalRange(bodyStart, bodyEnd, state, originalStateMap);
            if (result.error) {
                logMappingErrors('function body', result);
            } else {
                originalFunction.bodyStart = result.start;
                originalFunction.bodyEnd = result.end;
            }
        }
    };

    // function count
    state.astInfo.functions.forEach((it) => {

        // remove webpack wrap functions for functions count, not for ranges here
        if (it.generatedOnly) {
            return;
        }

        const {
            start, end, bodyStart, bodyEnd
        } = it;

        const result = findOriginalRange(start, end, state, originalStateMap, {
            checkName: true
        });
        if (result.error) {
            logMappingErrors('function', result);
            return;
        }

        const originalFunction = {
            ... it,
            generatedStart: start,
            generatedEnd: end,
            start: result.start,
            end: result.end,
            bodyStart: result.start,
            bodyEnd: result.end
        };

        if (result.name) {
            originalFunction.functionName = result.name;
        }

        // body start and end
        updateFunctionBodyRange(start, end, bodyStart, bodyEnd, originalFunction);

        // add back to original ast
        result.originalState.astInfo.functions.push(originalFunction);

    });

};

const handleOriginalBranchesCoverage = (state, originalStateMap) => {

    // branches only for js
    if (!state.js) {
        return;
    }

    // console.log(state.astInfo.branches);

    // function count
    state.astInfo.branches.forEach((group) => {

        if (group.generatedOnly) {
            return;
        }

        const { type, locations } = group;

        // start
        const result = findOriginalRange(group.start, group.end, state, originalStateMap);
        if (result.error) {
            logMappingErrors('branch group', result);
            return;
        }

        // new group start and end
        const groupStart = result.start;
        const groupEnd = result.end;

        let hasError;
        const newLocations = locations.map((oLoc) => {

            const newLoc = {
                ... oLoc
            };

            if (newLoc.none) {
                newLoc.start = groupStart;
                newLoc.end = groupEnd;
                return newLoc;
            }

            const locResult = findOriginalRange(newLoc.start, newLoc.end, state, originalStateMap);
            if (locResult.error) {
                // It should not happen unless it is minify files, the SourceMap has some order problems
                logMappingErrors('branch', locResult);
                hasError = true;
                return newLoc;
            }

            // before new range
            newLoc.generatedStart = newLoc.start;
            newLoc.generatedEnd = newLoc.end;
            // mapping to new range
            newLoc.start = locResult.start;
            newLoc.end = locResult.end;

            return newLoc;
        });

        // ignored group when found error
        if (hasError) {
            return;
        }

        // add back to original ast
        result.originalState.astInfo.branches.push({
            type,
            start: groupStart,
            end: groupEnd,
            locations: newLocations
        });

    });

};

const handleOriginalStatementsCoverage = (state, originalStateMap) => {

    // statements only for js
    if (!state.js) {
        return;
    }

    // statement count
    state.astInfo.statements.forEach((it) => {

        if (it.generatedOnly) {
            return;
        }

        const { start, end } = it;

        const result = findOriginalRange(start, end, state, originalStateMap);
        if (result.error) {
            logMappingErrors('statement', result);
            return;
        }

        // add back to original ast
        result.originalState.astInfo.statements.push({
            ... it,
            generatedStart: start,
            generatedEnd: end,
            start: result.start,
            end: result.end
        });

    });

    originalStateMap.forEach((originalState) => {
        const statements = originalState.astInfo.statements;
        if (Util.isList(statements)) {
            return;
        }
        // fake source nothing matched
        statements.push({
            start: 0,
            end: originalState.source.length,
            count: 1
        });

    });

};

// ========================================================================================================

const handleOriginalEmptyBytesCoverage = (state, originalStateMap) => {
    const checkList = [];

    // check original bytes if fully in a wrapper range
    originalStateMap.forEach((originalState) => {
        const bytes = originalState.bytes;
        if (Util.isList(bytes)) {
            return;
        }

        const { decodedMappings } = originalState;
        const len = decodedMappings.length;
        if (len < 2) {
            return;
        }
        // sort by original line/column
        const startMapping = decodedMappings[0];
        const endMapping = decodedMappings[len - 1];
        // console.log(startMapping, endMapping);
        const startOffset = startMapping.generatedOffset;

        if (!endMapping.generatedEndOffset) {
            // line last one
            const line = state.locator.getLine(endMapping.generatedLine + 1);
            // could be no line found
            if (line) {
                // last column
                endMapping.generatedEndOffset = line.end;
            } else {
                endMapping.generatedEndOffset = endMapping.generatedOffset;
            }
        }
        const endOffset = endMapping.generatedEndOffset;

        // console.log('===========================================================', originalState.sourcePath);
        // console.log(originalState.source.length, endMapping);

        checkList.push({
            originalState,
            startOffset,
            endOffset
        });

    });

    // no file to handle
    if (!checkList.length) {
        return;
    }

    // there is no state.bytes if not in debug
    // should using coverageList to generate bytes first
    handleGeneratedBytesCoverage(state);

    checkList.forEach((it) => {

        const {
            originalState, startOffset, endOffset
        } = it;

        // console.log('=============', 'no bytes', originalState.sourcePath);

        // only check uncovered range
        // because a uncovered range could be in a covered wrapper
        // { start: 0, end: 12137, count: 1 }, could be { start: > 0, end: < 12137, count: 0 }
        for (const range of state.bytes) {
            if (range.count > 0) {
                continue;
            }
            if (startOffset >= range.start && endOffset <= range.end) {
                // console.log('------------', 'added');
                originalState.bytes.push({
                    start: 0,
                    end: originalState.source.length,
                    count: 0
                });
                break;
            }
        }

    });
};


const handleAllOriginalBytesCoverage = (state, originalStateMap) => {

    const { js, coverageList } = state;

    // only for js, no sourcemap for css for now
    if (!js) {
        return;
    }

    // v8 coverage
    coverageList.forEach((block) => {
        block.ranges.forEach((range) => {

            // remove wrap functions for original files
            if (range.generatedOnly) {
                return;
            }

            const {
                startOffset, endOffset, count
            } = range;

            const result = findOriginalRange(startOffset, endOffset, state, originalStateMap, {
                fixOriginalRange: true
            });
            if (result.error) {
                logMappingErrors('byte', result);
                return;
            }

            addJsBytesCoverage(result.originalState, {
                generatedStart: startOffset,
                generatedEnd: endOffset,
                startOffset: result.start,
                endOffset: result.end,
                count
            });

        });
    });

    handleOriginalEmptyBytesCoverage(state, originalStateMap);

};

// ========================================================================================================

const decodeSourceMappings = (state, originalDecodedMap) => {

    const generatedLocator = state.locator;

    const {
        sources, mappings, decodedMappings
    } = state.sourceMap;

    const decodedList = decodedMappings || decode(mappings);

    // console.log(decodedList);

    sources.forEach((source, i) => {
        originalDecodedMap.set(i, []);
    });

    const allDecodedMappings = [];
    decodedList.forEach((segments, generatedLine) => {

        if (!segments.length) {
            return;
        }

        // line segments
        const lastIndex = segments.length - 1;
        segments.forEach((segment, i) => {

            // const COLUMN = 0;
            // const SOURCES_INDEX = 1;
            // const SOURCE_LINE = 2;
            // const SOURCE_COLUMN = 3;
            // const NAMES_INDEX = 4;
            const [generatedColumn, sourceIndex, originalLine, originalColumn, nameIndex] = segment;
            // the segment length could be 1, 4 or 5

            if (typeof sourceIndex === 'undefined') {
                // console.log('============================ sourceIndex undefined');
                // console.log(segment);
                return;
            }

            // 1-base
            const generatedSN = generatedLine + 1;

            const generatedOffset = generatedLocator.locationToOffset({
                // 1-base
                line: generatedSN,
                column: generatedColumn
            });

            const info = {
                generatedOffset,
                generatedLine,
                generatedColumn,

                sourceIndex,
                originalLine,
                originalColumn,
                nameIndex
            };

            // first and last column
            if (i === 0) {
                info.first = true;
            }
            if (i === lastIndex) {
                info.last = true;
            }

            allDecodedMappings.push(info);
            originalDecodedMap.get(sourceIndex).push(info);

            // calculate line end column
            if (!info.last) {
                return;
            }

            const lineItem = generatedLocator.getLine(generatedSN);
            if (!lineItem) {
                // console.log('============================== not found line item');
                return;
            }

            // console.log(generatedSN, generatedColumn, lineItem.length, lineItem.text);

            if (generatedColumn >= lineItem.length) {
                return;
            }

            const endColumn = {
                generatedOffset: generatedOffset + (lineItem.length - generatedColumn),
                generatedLine,
                generatedColumn: lineItem.length,

                end: true,

                sourceIndex,
                originalLine,
                originalColumn,
                nameIndex
            };

            // console.log(generatedSN, generatedColumn, info, endColumn);

            allDecodedMappings.push(endColumn);
            originalDecodedMap.get(sourceIndex).push(endColumn);

        });


    });

    // defaults to sort by generated offset, no need sort
    // allDecodedMappings.sort((a, b) => {
    //     return a.generatedOffset - b.generatedOffset;
    // });

    return allDecodedMappings;
};

const getOriginalDecodedMappings = (originalDecodedMap, sourceIndex, locator) => {
    // all mappings for the original file sorted
    const decodedMappings = originalDecodedMap.get(sourceIndex);

    if (!decodedMappings) {
        return [];
    }

    // calculate line end column
    decodedMappings.forEach((item) => {
        if (!item.end) {
            return;
        }
        const originalSN = item.originalLine + 1;
        const lineItem = locator.getLine(originalSN);
        // console.log(originalSN, item.originalColumn, lineItem.length, lineItem.text);
        if (lineItem) {
            item.originalColumn = lineItem.length;
        }
    });

    // sort by original line/column
    decodedMappings.sort((a, b) => {
        if (a.originalLine === b.originalLine) {
            return a.originalColumn - b.originalColumn;
        }
        return a.originalLine - b.originalLine;
    });

    // add offset and index
    decodedMappings.forEach((item, i) => {
        item.originalOffset = locator.locationToOffset({
            line: item.originalLine + 1,
            column: item.originalColumn
        });
    });

    return decodedMappings;
};

// ========================================================================================================

const initOriginalList = (state, originalDecodedMap, options) => {

    // source filter
    const sourceFilter = Util.getSourceFilter(options);

    // create original content mappings
    const originalStateMap = new Map();

    const { sources, sourcesContent } = state.sourceMap;

    const lengthBefore = sources.length;
    let lengthAfter = 0;

    sources.forEach((sourcePath, sourceIndex) => {

        // filter
        // do not change for sourceIndex
        if (!sourceFilter(sourcePath)) {
            // console.log('-', sourcePath);
            return;
        }
        // console.log(sourcePath);

        // console.log(`add source: ${k}`);
        const sourceContent = sourcesContent?.[sourceIndex];
        if (typeof sourceContent !== 'string') {
            Util.logError(`not found source content: ${sourcePath}`);
            return;
        }

        const locator = new Locator(sourceContent);
        const maxContentLength = sourceContent.length;

        const decodedMappings = getOriginalDecodedMappings(originalDecodedMap, sourceIndex, locator);

        // unpacked file always is js

        const type = getSourceType(sourcePath);

        const originalState = {
            original: true,
            // original file is js
            js: true,
            type,
            source: sourceContent,
            sourcePath,
            locator,
            maxContentLength,
            decodedMappings,
            // coverage info
            bytes: [],
            functions: [],
            branches: [],
            statements: [],
            astInfo: {
                functions: [],
                branches: [],
                statements: []
            },
            // coverage data
            v8Data: {}
        };

        originalStateMap.set(sourceIndex, originalState);
        lengthAfter += 1;
    });

    Util.logFilter(`source filter (${state.sourcePath}):`, lengthBefore, lengthAfter);

    return originalStateMap;
};

const collectOriginalList = (state, originalStateMap) => {

    const { fileUrls } = state;
    const distFile = state.sourcePath;

    let added = 0;

    // collect original files
    originalStateMap.forEach((originalState) => {

        const {
            js, type, sourcePath, source
        } = originalState;

        // add file item
        const url = fileUrls[sourcePath] || sourcePath;

        // add dist for id
        const id = Util.calculateSha1(sourcePath + source);

        const sourceItem = {
            url,
            id,
            js,
            type,
            sourcePath,
            distFile,
            source
        };

        // save v8 data and add to originalList
        originalState.v8Data = sourceItem;
        state.originalList.push(originalState);
        added += 1;
    });

    Util.logDebug(`added source files: ${EC.yellow(added)}`);

};

// ========================================================================================================

const generateCoverageForDist = (state) => {

    handleFunctionsCoverage(state);
    handleBranchesCoverage(state);
    handleStatementsCoverage(state);
    handleGeneratedBytesCoverage(state);

};

const handleUncoveredInCovered = (state, originalStateMap) => {
    if (!state.fake) {
        return;
    }

    // fake statements/branches/functions
    originalStateMap.forEach((originalState) => {
        const { bytes } = originalState;
        const list = [];
        originalState.bytes = bytes.filter((item) => {
            if (item.count === 0) {
                const range = bytes.find((it) => {
                    if (it.count === 0) {
                        return false;
                    }
                    if (it.start > item.end) {
                        return false;
                    }
                    if (it.end < item.start) {
                        return false;
                    }
                    return true;
                });
                if (range) {
                    list.push(item);
                    return false;
                }
            }
            return true;
        });

        if (!list.length) {
            return;
        }

        list.forEach((item) => {
            ['statements', 'branches', 'functions'].forEach((key) => {
                originalState[key] = originalState[key].filter((it) => {
                    if (it.start === item.start && it.end === item.end) {
                        return false;
                    }
                    return true;
                });
            });
        });

    });

};

const unpackSourceMap = (state, options) => {

    const { sourceMap, sourcePath } = state;

    // keep original urls
    const fileUrls = {};
    initSourceMapSourcesPath(fileUrls, sourceMap, sourcePath, options);
    state.fileUrls = fileUrls;
    // for function names
    state.sourceMapNames = sourceMap.names || [];

    // ===============================================
    // decode mappings for each original file

    const originalDecodedMap = new Map();
    // for find-original-range
    state.decodedMappings = decodeSourceMappings(state, originalDecodedMap);

    // filter original list and init list
    const originalStateMap = initOriginalList(state, originalDecodedMap, options);

    originalDecodedMap.clear();

    // ===============================================

    // handle functions before handle original state functions
    handleOriginalFunctionsCoverage(state, originalStateMap);
    handleOriginalBranchesCoverage(state, originalStateMap);
    handleOriginalStatementsCoverage(state, originalStateMap);

    // handle lines info before handle ranges to update line count
    originalStateMap.forEach((originalState) => {

        handleFunctionsCoverage(originalState);
        handleBranchesCoverage(originalState);
        handleStatementsCoverage(originalState);

        // if (originalState.sourcePath.endsWith('demo.js')) {
        //     console.log('=================================', originalState.sourcePath);
        // }

    });

    // handle bytes ranges
    handleAllOriginalBytesCoverage(state, originalStateMap);

    originalStateMap.forEach((originalState) => {
        handleOriginalBytesCoverage(originalState);
    });

    // remove uncovered in covered for fake
    handleUncoveredInCovered(state, originalStateMap);

    // collect coverage for original list
    collectOriginalList(state, originalStateMap);

};

const unpackDistFile = (item, state, options) => {

    if (state.sourceMap) {
        if (Util.isDebug()) {
            // js self
            item.debug = true;
            generateCoverageForDist(state);
        } else {
            item.dedupe = true;
        }

        // unpack source map
        unpackSourceMap(state, options);

    } else {

        // css/js self
        generateCoverageForDist(state);

    }

};

// ========================================================================================================

const filterCoverageList = (item) => {
    const {
        functions, scriptOffset, source
    } = item;

    // no script offset
    if (!scriptOffset) {
        return functions;
    }

    // vm script offset
    const minOffset = scriptOffset;
    // the inline sourcemap could be removed
    const maxOffset = source.length;

    const wrapperList = [];

    const coverageList = functions.filter((block) => {

        const { ranges } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        const { startOffset, endOffset } = functionRange;
        if (startOffset >= minOffset && endOffset <= maxOffset) {
            return true;
        }

        wrapperList.push(block);

        return false;
    });

    if (wrapperList.length) {
        const rootBlock = wrapperList.pop();
        rootBlock.root = true;
        coverageList.unshift(rootBlock);
    }

    // if (item.sourcePath.includes('PlaceB.tsx')) {
    //     console.log(coverageList);
    // }

    return coverageList;
};

const initJsCoverageList = (item) => {
    const coverageList = filterCoverageList(item);

    // if (item.sourcePath.includes('PlaceB.tsx')) {
    //     console.log(coverageList[0]);
    // }

    // function could be covered even it is defined after an uncovered return, see case closures.js
    // fix uncovered range if there are covered ranges in uncovered range

    const uncoveredBlocks = [];
    const uncoveredList = [];
    coverageList.forEach((block) => {
        block.ranges.forEach((range, i) => {
            const {
                count, startOffset, endOffset
            } = range;

            if (i === 0) {
                // check only first level
                if (count > 0) {
                    const inUncoveredRange = Util.findInRanges(startOffset, endOffset, uncoveredBlocks, 'startOffset', 'endOffset');
                    if (inUncoveredRange) {
                        if (!inUncoveredRange.coveredList) {
                            inUncoveredRange.coveredList = [];
                            uncoveredList.push(inUncoveredRange);
                        }
                        inUncoveredRange.coveredList.push(range);
                    }
                }
                return;
            }

            if (count === 0) {
                uncoveredBlocks.push({
                    ... range,
                    index: i,
                    ranges: block.ranges
                });
            }

        });
    });

    if (uncoveredList.length) {

        uncoveredList.forEach((it) => {
            const {
                ranges, index, count, coveredList
            } = it;

            // remove previous range first
            const args = [index, 1];

            Util.sortOffsetRanges(coveredList);
            let startOffset = it.startOffset;
            coveredList.forEach((cov) => {
                // ignore sub functions in the function
                if (cov.startOffset > startOffset) {
                    args.push({
                        startOffset,
                        endOffset: cov.startOffset,
                        count
                    });
                    startOffset = cov.endOffset;
                }
            });

            if (it.endOffset > startOffset) {
                args.push({
                    startOffset,
                    endOffset: it.endOffset,
                    count
                });
            }

            ranges.splice(... args);

        });
    }

    return coverageList;
};

const logConvertTime = (msg, time_start, untested) => {
    if (untested) {
        return;
    }
    Util.logTime(msg, time_start);
};

const convertCoverages = (list, options, untested) => {
    const stateList = [];

    for (const item of list) {
        // console.log([item.id]);

        const time_start_ast = Date.now();

        const {
            type, source, fake, sourcePath
        } = item;

        // for source file, type could be ts or vue as extname, but js = true
        const js = type === 'js';
        item.js = js;

        // source mapping
        const locator = new Locator(source);
        const maxContentLength = source.length;

        // ============================
        // move sourceMap
        const sourceMap = item.sourceMap;
        if (sourceMap) {
            delete item.sourceMap;
        }

        // ============================
        // move functions and ranges to coverageList
        let coverageList = [];
        let astInfo;
        if (js) {
            coverageList = initJsCoverageList(item);
            // remove original functions
            if (!Util.isDebug()) {
                delete item.functions;
            }
            astInfo = getJsAstInfo(item, coverageList);
        } else {
            // convent css covered ranges to rules ranges and include uncovered ranges
            astInfo = getCssAstInfo(item, coverageList);
            // remove original ranges
            if (!Util.isDebug()) {
                delete item.ranges;
            }
        }

        logConvertTime(`${EC.magenta('│ ')}${EC.cyan('├')} [convert] parsed ast: ${sourcePath} (${EC.cyan(Util.BSF(maxContentLength))})`, time_start_ast, untested);

        // console.log(sourcePath, astInfo.statements.length);
        // ============================

        const time_start_unpack = Date.now();

        // current file and it's sources from sourceMap
        // see const originalState
        const state = {
            js,
            type,
            source,
            fake,
            sourcePath,
            sourceMap,
            locator,
            maxContentLength,
            decodedMappings: [],
            rangeCache: new Map(),
            diffCache: new Map(),

            // alignTextList: [],

            // coverage info
            bytes: [],
            functions: [],
            branches: [],
            statements: [],
            astInfo,
            // for sub source files
            coverageList,
            originalList: [],
            // coverage data
            v8Data: item
        };

        unpackDistFile(item, state, options);
        const unpackedFiles = EC.cyan(`${state.originalList.length} files`);

        stateList.push(state);

        logConvertTime(`${EC.magenta('│ ')}${EC.cyan('├')} [convert] unpacked sourcemap: ${sourcePath} (${unpackedFiles})`, time_start_unpack, untested);

    }

    return stateList;
};

// ========================================================================================================

const isUncoveredRange = (range, key, uncoveredGroups) => {

    let uncovered = true;
    uncoveredGroups.forEach((group) => {
        const { groupMap, state } = group;

        // ========================================================
        // self key
        if (groupMap.has(key)) {
            return;
        }

        // ========================================================
        // in all group
        for (const item of groupMap.values()) {
            if (range.start >= item.start && range.end <= item.end) {
                return;
            }
        }

        // ========================================================
        // no sourcemap mappings in range
        // check original range in decodedMappings
        const { decodedMappings } = state;
        const item = decodedMappings.find((it) => it.originalOffset >= range.start && it.originalOffset <= range.end);
        if (!item) {
            return;
        }

        // ========================================================
        uncovered = false;

    });

    return uncovered;

};

const mergeV8Data = (state, stateList) => {
    // console.log(stateList);

    // let debug = false;
    // if (state.sourcePath.endsWith('counter')) {
    //     debug = true;
    //     console.log('merge v8 data ===================================', state.sourcePath);
    //     console.log('bytes before ============', stateList.map((it) => it.bytes));
    //     // console.log('statements ==============', stateList.map((it) => it.statements));
    //     // console.log('functions ==============', stateList.map((it) => it.functions));
    //     // console.log('branches ======================', stateList.map((it) => it.branches.map((b) => [`${b.start}-${b.end}`, JSON.stringify(b.locations.map((l) => l.count))])));
    // }

    // ===========================================================
    // bytes
    const mergedBytes = [];

    const coveredMap = new Map();
    const uncoveredMap = new Map();
    const uncoveredGroups = [];
    stateList.forEach((st) => {
        const groupMap = new Map();
        const bytes = dedupeCountRanges(st.bytes);
        bytes.forEach((range) => {
            const key = `${range.start}_${range.end}`;
            if (range.count) {
                mergedBytes.push(range);
                coveredMap.set(key, true);
            } else {
                uncoveredMap.set(key, range);
                groupMap.set(key, range);
            }
        });

        uncoveredGroups.push({
            groupMap,
            state: st
        });
    });

    // if (debug) {
    //     console.log('coveredMap ============', coveredMap);
    //     console.log('uncoveredMap ============', uncoveredMap);
    //     console.log('uncoveredGroups ============', uncoveredGroups);
    // }

    uncoveredMap.forEach((range, key) => {

        // in covered range
        if (coveredMap.has(key)) {
            return;
        }

        if (isUncoveredRange(range, key, uncoveredGroups)) {
            mergedBytes.push(range);
        }

    });

    // will be dedupeCountRanges in collectFileCoverage
    state.bytes = mergedBytes;

    // if (debug) {
    //     console.log('bytes after ============', mergedBytes);
    // }

    // ===========================================================
    // functions
    const allFunctions = stateList.map((it) => it.functions).flat();
    const functionComparer = (lastRange, range) => {
        // if (lastRange.start === range.start && lastRange.end === range.end) {
        //     return true;
        // }

        // function range could be from sourcemap, not exact matched

        // end is same
        // {start: 2017, end: 2315, count: 481}
        // {start: 2018, end: 2315, count: 14}

        // start is same
        // {start: 10204, end: 10379, count: 0}
        // {start: 10204, end: 10393, count: 5}

        // only one position matched could be same
        if (lastRange.start === range.start || lastRange.end === range.end) {
            // console.log(lastRange.start, range.start, lastRange.end, range.end);

            // if (lastRange.start === range.start) {
            //     console.log(range.end - lastRange.end, lastRange.start, lastRange.end, 'end', range.end, state.sourcePath);
            // } else {
            //     console.log(range.start - lastRange.start, lastRange.start, lastRange.end, 'start', range.start, state.sourcePath);
            // }

            return true;
        }

        return false;
    };
    const functionHandler = (lastRange, range) => {
        lastRange.count += range.count;
    };
    const mergedFunctions = mergeRangesWith(allFunctions, functionComparer, functionHandler);
    state.functions = mergedFunctions;

    // ===========================================================
    // statements
    const allStatements = stateList.map((it) => it.statements).flat();
    const statementComparer = (lastRange, range) => {
        // exact matched because the statement range is generated from ast
        return lastRange.start === range.start && lastRange.end === range.end;
    };
    const statementHandler = (lastRange, range) => {
        // merge statements count
        lastRange.count += range.count;
    };
    const mergedStatements = mergeRangesWith(allStatements, statementComparer, statementHandler);
    state.statements = mergedStatements;

    // ===========================================================
    // branches
    const allBranches = stateList.map((it) => it.branches).flat();
    const branchComparer = (lastRange, range) => {
        // exact matched because the branch range is generated from ast
        return lastRange.start === range.start && lastRange.end === range.end;
    };
    const branchHandler = (lastRange, range) => {
        // merge locations count
        lastRange.locations.forEach((item, i) => {
            const loc = range.locations[i];
            if (loc) {
                item.count += loc.count;
            }
        });
    };
    const mergedBranches = mergeRangesWith(allBranches, branchComparer, branchHandler);
    state.branches = mergedBranches;

    // if (sourcePath.endsWith('scroll_zoom.ts')) {
    // console.log(mergedBytes);
    // console.log(mergedFunctions);
    // console.log(mergedBranches.map((b) => [`${b.start}-${b.end}`, JSON.stringify(b.locations.map((l) => l.count))]));
    // }


};

const addUntestedFiles = async (stateList, options) => {

    const time_start_untested = Date.now();

    const testedMap = new Map();
    stateList.forEach((state) => {
        const { v8Data, originalList } = state;
        // dedupe dist file if not debug
        if (!v8Data.dedupe) {
            testedMap.set(state.sourcePath, true);
        }
        originalList.forEach((originalState) => {
            testedMap.set(originalState.sourcePath, true);
        });
    });

    // console.log('testedMap', testedMap);

    const untestedList = await getUntestedList(testedMap, options, 'v8');
    if (!untestedList) {
        return;
    }

    const untestedStateList = convertCoverages(untestedList, options, true);

    // console.log(untestedStateList);
    untestedStateList.forEach((state) => {
        stateList.push(state);
    });

    // console.log('untestedList', untestedList);

    Util.logTime(`${EC.magenta('│ ')}${EC.cyan('├')} [convert] added untested files: ${EC.yellow(untestedList.length)}`, time_start_untested);


};

const generateV8DataList = (stateList, options) => {

    const stateMap = new Map();

    // all original files from dist
    const allOriginalList = [];
    stateList.forEach((state) => {
        const { v8Data, originalList } = state;
        // dedupe dist file if not debug
        if (!v8Data.dedupe) {
            stateMap.set(v8Data.id, state);
        }
        allOriginalList.push(originalList);
    });

    // merge istanbul and v8(converted)
    const mergeMap = new Map();
    allOriginalList.flat().forEach((originalState) => {
        const { v8Data } = originalState;
        const id = v8Data.id;
        // exists item
        const prevState = stateMap.get(id);
        if (prevState) {
            // ignore empty item, just override it
            if (!prevState.v8Data.empty) {
                if (mergeMap.has(id)) {
                    mergeMap.get(id).push(originalState);
                } else {
                    mergeMap.set(id, [prevState, originalState]);
                }
                return;
            }
        }
        stateMap.set(id, originalState);
    });

    const mergeIds = mergeMap.keys();
    for (const id of mergeIds) {
        const state = stateMap.get(id);
        // for source the type could be ts, so just use js (boolean)
        if (state.js) {
            mergeV8Data(state, mergeMap.get(id));
        } else {
            // should no css here, css can not be in sources
        }
    }

    // new v8 data list (includes sources)
    const v8DataList = [];
    // global file sources and istanbul coverage data
    const fileSources = {};
    const coverageData = {};
    stateMap.forEach((state) => {
        const { v8Data } = state;
        const istanbulData = collectFileCoverage(v8Data, state, options);
        const { sourcePath, source } = v8Data;
        v8DataList.push(v8Data);
        fileSources[sourcePath] = source;
        coverageData[sourcePath] = istanbulData;
    });

    // sort v8DataList (files)
    v8DataList.sort((a, b) => {
        if (a.sourcePath > b.sourcePath) {
            return 1;
        }
        return -1;
    });

    return {
        v8DataList,
        fileSources,
        coverageData
    };
};

const convertV8List = async (v8list, options) => {

    // for tested files
    const stateList = convertCoverages(v8list, options);

    // empty coverage handler
    await addUntestedFiles(stateList, options);

    const time_start_convert = Date.now();
    const dataList = generateV8DataList(stateList, options);
    const dataFiles = EC.cyan(`${dataList.v8DataList.length} files`);
    Util.logTime(`${EC.magenta('│ ')}${EC.cyan('├')} [convert] converted data list (${dataFiles})`, time_start_convert);

    return dataList;
};

module.exports = {
    convertV8List
};
