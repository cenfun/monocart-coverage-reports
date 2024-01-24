/**
 * V8 Coverage Data Converter
 * @copyright https://github.com/cenfun/monocart-coverage-reports
 * @author cenfun@gmail.com
 */

const path = require('path');

const Util = require('../utils/util.js');

// position mapping for conversion between offset and line/column
const { Locator } = require('monocart-formatter');
const findOriginalRange = require('./find-original-range.js');
const { getJsAstInfo, getCssAstInfo } = require('./ast.js');
const { getIgnoredRanges } = require('./ignore.js');

const {
    sortRanges, dedupeCountRanges, mergeRangesWith
} = require('../utils/dedupe.js');
const { getSourceType, initSourceMapSourcePath } = require('../utils/source-path.js');
const { decode } = require('../packages/monocart-coverage-vendor.js');

const InfoLine = require('./info-line.js');
const InfoBranch = require('./info-branch.js');
const InfoFunction = require('./info-function.js');
const findInRanges = require('./find-in-ranges.js');

// ========================================================================================================

const handleIgnoredRanges = (list, ignoredRanges) => {
    list.forEach((item) => {
        if (item.count > 0) {
            return;
        }
        const range = findInRanges(item.start, item.end, ignoredRanges);
        if (range) {
            // console.log(item, range);
            item.ignored = true;
        }
    });
};

// ========================================================================================================

const updateLinesCount = (bytes, locator, lineMap) => {
    bytes.forEach((range) => {

        const {
            start, end, count, ignored
        } = range;

        const sLoc = locator.offsetToLocation(start);
        const eLoc = locator.offsetToLocation(end);

        // update lines coverage
        const lines = Util.getRangeLines(sLoc, eLoc);

        lines.forEach((it) => {
            const line = lineMap.get(it.line);
            if (!line) {
                return;
            }

            // from outside into inside, uncovered is certain
            // default is covered
            if (it.entire) {
                line.covered = count > 0;
                line.count = count;

                if (ignored) {
                    if (!line.covered) {
                        line.ignored = true;
                    }
                }

            } else {

                if (!ignored) {
                    if (count > 0) {
                        line.count = count;
                    } else {
                    // not covered if any count = 0
                        line.covered = false;
                    }
                }

            }

            // if (!line.history) {
            //     line.history = [];
            // }
            // line.history.push(`${it.entire}-${count}`);

        });

    });

    // if (state.sourcePath.endsWith('component.js')) {
    //     console.log('===========================================', state.sourcePath);
    // }

};

const handleLinesCoverage = (bytes, locator) => {

    const lines = [];
    // line 1 based
    const lineMap = new Map();

    // init lines
    let blankCount = 0;
    let commentCount = 0;

    locator.lines.forEach((it) => {
        // exclude blank and comment
        if (it.blank) {
            blankCount += 1;
            return;
        }
        if (it.comment) {
            commentCount += 1;
            return;
        }
        // line 1-base
        const line = it.line + 1;
        // default count to 1, both js and css
        const lineInfo = new InfoLine(line, it.length, 1);
        lineMap.set(line, lineInfo);
        lines.push(lineInfo);
    });

    updateLinesCount(bytes, locator, lineMap);

    return {
        lines,
        blankCount,
        commentCount
    };
};

// ========================================================================================================

const calculateV8Functions = (functions) => {

    const v8Functions = {
        total: 0,
        covered: 0
    };

    functions.forEach((fn) => {
        if (fn.ignored) {
            return;
        }

        v8Functions.total += 1;
        if (fn.count > 0) {
            v8Functions.covered += 1;
        }
    });

    return v8Functions;
};

const calculateV8Branches = (branches) => {
    const v8Branches = {
        total: 0,
        covered: 0
    };

    branches.forEach((branch) => {
        if (branch.ignored) {
            return;
        }
        v8Branches.total += 1;
        if (branch.count > 0) {
            v8Branches.covered += 1;
        }
    });

    return v8Branches;
};

const calculateV8Lines = (lines, blankCount, commentCount) => {
    const v8Lines = {
        total: 0,
        covered: 0,
        blank: blankCount,
        comment: commentCount
    };

    lines.forEach((ln) => {
        if (ln.ignored) {
            // console.log(ln);
            return;
        }
        v8Lines.total += 1;
        // full line covered
        if (ln.covered) {
            v8Lines.covered += 1;
        }
    });

    return v8Lines;
};

// ========================================================================================================
// istanbul coverage format
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

        sourcePath,
        locator
    } = state;

    // ==========================================
    // v8 data
    const data = {
        bytes: dedupeCountRanges(bytes),
        functions: [],
        branches: []
    };

    // ==========================================
    // ignore
    const ignoredRanges = getIgnoredRanges(locator, options);
    if (ignoredRanges) {

        // data bytes is start/end/count object
        handleIgnoredRanges(data.bytes, ignoredRanges);

        // functions is InfoFunction start/end/count instance
        handleIgnoredRanges(functions, ignoredRanges);

        // branches is InfoBranch start/end/count instance
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

        // console.log(ignoredRanges);

    }

    data.functions = functions.map((info) => {
        return info.getRange();
    });
    sortRanges(data.functions);

    // branch group with locations to flat branches
    data.branches = branches.map((info) => {
        return info.getRanges();
    }).flat();
    sortRanges(data.branches);

    // ==========================================
    // lines
    // after bytes with ignored, before calculateV8Lines
    const {
        lines, blankCount, commentCount
    } = handleLinesCoverage(data.bytes, locator);

    // ==========================================
    // v8 data and summary
    v8Data.data = data;
    v8Data.summary = {
        functions: calculateV8Functions(data.functions),
        branches: calculateV8Branches(data.branches),
        lines: calculateV8Lines(lines, blankCount, commentCount)
    };

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

    // for codecov https://docs.codecov.com/docs/codecov-custom-coverage-format
    data.lines = {};

    lines.filter((it) => !it.ignored).forEach((line, index) => {
        istanbulData.statementMap[`${index}`] = line.generate();
        istanbulData.s[`${index}`] = line.count;

        let count = 0;
        if (line.covered) {
            count = line.count;
        } else if (!line.covered && line.count > 0) {
            count = '1/2';
        }
        // 1-base
        data.lines[`${line.line}`] = count;
    });

    functions.filter((it) => !it.ignored).forEach((fn, index) => {
        istanbulData.fnMap[`${index}`] = fn.generate(locator);
        istanbulData.f[`${index}`] = fn.count;
    });

    branches.filter((it) => !it.ignored).forEach((branch, index) => {
        const { map, counts } = branch.generate(locator);
        istanbulData.branchMap[`${index}`] = map;
        istanbulData.b[`${index}`] = counts;
    });

    // istanbul data
    return istanbulData;

};

// ========================================================================================================

const addJsBytesCoverage = (state, range) => {
    const {
        startOffset, endOffset, count
    } = range;
    // add bytes range
    state.bytes.push({
        start: startOffset,
        end: endOffset,
        count
    });
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

const handleFunctionsCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const { functions, astInfo } = state;
    astInfo.functions.forEach((it) => {
        const {
            start, end, functionName, count
        } = it;
        const functionInfo = new InfoFunction(start, end, count, functionName);
        functions.push(functionInfo);
    });

};

const handleBranchesCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const { branches, astInfo } = state;
    astInfo.branches.forEach((it) => {
        const {
            start, end, locations, type
        } = it;
        const branchInfo = new InfoBranch(start, end, locations, type);
        branches.push(branchInfo);
    });

};

const handleBytesCoverage = (state) => {

    const { js, coverageList } = state;

    if (js) {
        coverageList.forEach((block) => {
            block.ranges.forEach((range) => {
                addJsBytesCoverage(state, range);
            });
        });
    } else {
        coverageList.forEach((range) => {
            addCssBytesCoverage(state, range);
        });
    }

};

// ========================================================================================================

const handleOriginalFunctionsCoverage = (state, originalMap) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    // console.log(state.astInfo.functions);

    // function count
    state.astInfo.functions.forEach((it) => {
        const {
            start, end, wrap
        } = it;

        // remove webpack wrap functions for functions count, not for ranges here
        if (wrap) {
            return;
        }

        // rename to startOffset and endOffset
        const range = {
            startOffset: start,
            endOffset: end
        };

        const result = findOriginalRange(range, state, originalMap);
        if (result.error) {
            return;
        }
        const { originalRange, originalState } = result;

        // add back to original ast
        originalState.astInfo.functions.push({
            ... it,
            generatedStart: start,
            generatedEnd: end,
            start: originalRange.startOffset,
            end: originalRange.endOffset
        });

        // if (originalState.sourcePath.endsWith('store.js')) {
        //     console.log('==========================================================');
        //     console.log(it, result.startMapping, result.endMapping);
        // }

    });

};

const handleOriginalBranchesCoverage = (state, originalMap) => {

    // branches only for js
    if (!state.js) {
        return;
    }

    // console.log(state.astInfo.branches);

    // function count
    state.astInfo.branches.forEach((it) => {

        const { type, locations } = it;

        // rename to startOffset and endOffset
        const bRange = {
            startOffset: it.start,
            endOffset: it.end
        };

        // start
        const result = findOriginalRange(bRange, state, originalMap);
        if (result.error) {
            // not in the original files
            return;
        }
        const { originalRange, originalState } = result;

        const groupStart = originalRange.startOffset;
        const groupEnd = originalRange.endOffset;

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

            const { start, end } = newLoc;

            const lRange = {
                startOffset: start,
                endOffset: end
            };
            const res = findOriginalRange(lRange, state, originalMap);
            if (res.error) {
                // It should not happen unless it is minify files, the SourceMap has some order problems

                hasError = true;

                // console.log('====================================', state.sourcePath, loc);
                // console.log(res.errors);
                // Util.logError(`Not found original branch. start: ${start}, end: ${end}`);

                return newLoc;
            }

            // mapping to new range
            const oRage = res.originalRange;
            newLoc.start = oRage.startOffset;
            newLoc.end = oRage.endOffset;

            return newLoc;
        });

        // ignored group when found error
        if (hasError) {
            return;
        }

        // add back to original ast
        originalState.astInfo.branches.push({
            type,
            start: groupStart,
            end: groupEnd,
            locations: newLocations
        });

    });

};

const handleOriginalBytesCoverage = (state, originalMap) => {

    const { js, coverageList } = state;

    // const time_start_mapping = Date.now();
    if (js) {
        // v8 coverage
        coverageList.forEach((block) => {
            block.ranges.forEach((range, index) => {

                // remove wrap functions for original files
                if (range.wrap) {
                    // console.log(range);
                    return;
                }

                const result = findOriginalRange(range, state, originalMap);
                if (result.error) {
                    return;
                }

                const { originalRange, originalState } = result;
                addJsBytesCoverage(originalState, originalRange);

                // if (originalRange.startOffset === 110 && originalRange.endOffset === 271) {
                //     console.log('===============================', originalState.sourcePath);
                //     console.log(result.startMapping, result.endMapping);
                // }

            });
        });

    } else {
        // support css later
        // current css no sourceMap, so never come in
        // coverageList.forEach((range) => {

        // });
    }

};

// ========================================================================================================

const decodeSourceMappings = (state, originalDecodedMap) => {

    const generatedLocator = state.locator;

    const { sources, mappings } = state.sourceMap;

    const decodedList = decode(mappings);

    sources.forEach((source, i) => {
        originalDecodedMap.set(i, []);
    });

    const allDecodedMappings = [];
    let generatedIndex = 0;
    decodedList.forEach((segments, generatedLine) => {
        let info = null;
        segments.forEach((segment) => {
            const [generatedColumn, sourceIndex, originalLine, originalColumn] = segment;
            const generatedOffset = generatedLocator.locationToOffset({
                // 1-base
                line: generatedLine + 1,
                column: generatedColumn
            });

            info = {
                generatedOffset,
                generatedLine,
                generatedColumn,
                generatedIndex,

                sourceIndex,
                originalLine,
                originalColumn
            };

            allDecodedMappings.push(info);
            generatedIndex += 1;

            if (typeof sourceIndex === 'undefined') {
                return;
            }

            originalDecodedMap.get(sourceIndex).push(info);

        });

        // line last one
        if (info) {
            const line = generatedLocator.getLine(info.generatedLine + 1);
            // last column
            info.generatedEndOffset = info.generatedOffset + (line.length - info.generatedColumn);
        }

    });

    // defaults to sort by generated offset, not need sort
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

    // sort by original line/column
    decodedMappings.sort((a, b) => {
        if (a.originalLine === b.originalLine) {
            return a.originalColumn - b.originalColumn;
        }
        return a.originalLine - b.originalLine;
    });

    // add offset and index
    decodedMappings.forEach((item, i) => {
        item.originalIndex = i;
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
    let sourceFilter = options.sourceFilter;
    if (typeof sourceFilter !== 'function') {
        sourceFilter = () => true;
    }

    // create original content mappings
    const originalMap = new Map();

    const { sources, sourcesContent } = state.sourceMap;

    sources.forEach((sourcePath, sourceIndex) => {

        // filter
        if (!sourceFilter(sourcePath)) {
            return;
        }

        // console.log(`add source: ${k}`);
        const sourceContent = sourcesContent[sourceIndex];
        if (typeof sourceContent !== 'string') {
            Util.logError(`not found source content: ${sourcePath}`);
            return;
        }

        const locator = new Locator(sourceContent);

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
            decodedMappings,
            // coverage info
            bytes: [],
            functions: [],
            branches: [],
            astInfo: {
                functions: [],
                branches: []
            },
            // coverage data
            v8Data: {}
        };

        originalMap.set(sourceIndex, originalState);
    });

    return originalMap;
};

const collectOriginalList = (state, originalMap) => {

    const { fileUrls, sourceMap } = state;
    const distFile = sourceMap.file || path.basename(state.sourcePath);

    // collect original files
    originalMap.forEach((originalState) => {

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
    });

};

// ========================================================================================================

const generateCoverageForDist = (state) => {

    handleFunctionsCoverage(state);
    handleBranchesCoverage(state);
    handleBytesCoverage(state);

};

const unpackSourceMap = (state, options) => {

    const { sourceMap } = state;

    // keep original urls
    const fileUrls = {};
    const sourcePathHandler = options.sourcePath;
    initSourceMapSourcePath(sourceMap, fileUrls, sourcePathHandler);
    state.fileUrls = fileUrls;

    // ===============================================
    // decode mappings for each original file

    const originalDecodedMap = new Map();
    // for find-original-range
    state.decodedMappings = decodeSourceMappings(state, originalDecodedMap);

    // filter original list and init list
    const originalMap = initOriginalList(state, originalDecodedMap, options);

    originalDecodedMap.clear();

    // ===============================================

    // handle functions before handle original state functions
    handleOriginalFunctionsCoverage(state, originalMap);
    handleOriginalBranchesCoverage(state, originalMap);

    // handle lines info before handle ranges to update line count
    originalMap.forEach((originalState) => {

        handleFunctionsCoverage(originalState);
        handleBranchesCoverage(originalState);

        // if (originalState.sourcePath.endsWith('demo.js')) {
        //     console.log('=================================', originalState.sourcePath);
        // }

    });

    // handle ranges after lines ready
    handleOriginalBytesCoverage(state, originalMap);

    // collect coverage for original list
    collectOriginalList(state, originalMap);

};

const unpackDistFile = (item, state, options) => {

    if (state.sourceMap) {
        if (Util.loggingType === 'debug') {
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

    const rootFunctionInfo = {
        root: true,
        ranges: [{
            startOffset: minOffset,
            endOffset: maxOffset,
            count: 1
        }]
    };

    const coverageList = functions.filter((block) => {
        const { ranges } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        const { startOffset, endOffset } = functionRange;
        if (startOffset >= minOffset && endOffset <= maxOffset) {
            return true;
        }

        // blocks
        const len = ranges.length;
        if (len > 1) {
            for (let i = 1; i < len; i++) {
                const range = ranges[i];
                if (range.startOffset >= minOffset && range.endOffset <= maxOffset) {
                    rootFunctionInfo.ranges.push(range);
                }
            }
        }

        return false;
    });

    // first one for root function
    if (rootFunctionInfo.ranges.length > 1) {
        coverageList.unshift(rootFunctionInfo);
    }

    return coverageList;
};

// ========================================================================================================

const isCoveredInRanges = (range, uncoveredBytes) => {
    if (!uncoveredBytes.length) {
        return true;
    }
    for (const item of uncoveredBytes) {
        if (range.start >= item.start && range.end <= item.end) {
            return false;
        }
    }
    return true;
};

const mergeV8Data = (state, stateList) => {
    // console.log(stateList);

    // const sourcePath = state.sourcePath;
    // console.log(sourcePath);
    // if (sourcePath.endsWith('scroll_zoom.ts')) {
    // console.log('merge v8 data ===================================', sourcePath);
    // console.log(stateList.map((it) => it.bytes));
    // console.log(stateList.map((it) => it.functions));
    // console.log(stateList.map((it) => it.branches.map((b) => [`${b.start}-${b.end}`, JSON.stringify(b.locations.map((l) => l.count))])));
    // }

    // ===========================================================
    // bytes
    const mergedBytes = [];
    const uncoveredList = [];
    stateList.forEach((st) => {
        const bytes = dedupeCountRanges(st.bytes);
        const uncoveredBytes = [];
        bytes.forEach((range) => {
            if (range.count) {
                mergedBytes.push(range);
            } else {
                uncoveredBytes.push(range);
            }
        });
        uncoveredList.push(uncoveredBytes);
    });
    // just remove uncovered range
    uncoveredList.forEach((currentBytes) => {
        currentBytes.forEach((range) => {
            for (const targetBytes of uncoveredList) {
                if (targetBytes === currentBytes) {
                    continue;
                }
                if (isCoveredInRanges(range, targetBytes)) {
                    return;
                }
            }
            mergedBytes.push(range);
        });
    });

    // will be dedupeCountRanges in collectFileCoverage
    state.bytes = mergedBytes;

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

    return {
        v8DataList,
        fileSources,
        coverageData
    };
};

const convertV8List = (v8list, options) => {

    const stateList = [];

    for (const item of v8list) {
        // console.log([item.id]);

        const {
            type, source, sourcePath
        } = item;

        // for source file, type could be ts or vue as extname, but js = true
        const js = type === 'js';
        item.js = js;

        // source mapping
        const locator = new Locator(source);

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
            coverageList = filterCoverageList(item);
            // remove original functions
            if (Util.loggingType !== 'debug') {
                delete item.functions;
            }
            astInfo = getJsAstInfo(item, coverageList);
        } else {
            // convent css covered ranges to rules ranges and include uncovered ranges
            astInfo = getCssAstInfo(item, coverageList);
            // remove original ranges
            if (Util.loggingType !== 'debug') {
                delete item.ranges;
            }
        }

        // ============================

        // current file and it's sources from sourceMap
        // see const originalState
        const state = {
            js,
            type,
            source,
            sourcePath,
            sourceMap,
            locator,
            decodedMappings: [],
            // coverage info
            bytes: [],
            functions: [],
            branches: [],
            astInfo,
            // for sub source files
            coverageList,
            originalList: [],
            // coverage data
            v8Data: item
        };

        unpackDistFile(item, state, options);

        stateList.push(state);

    }

    return generateV8DataList(stateList, options);

};

module.exports = {
    convertV8List
};
