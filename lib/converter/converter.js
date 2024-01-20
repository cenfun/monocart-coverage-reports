// https://github.com/demurgos/v8-coverage
/**
 * @ranges is always non-empty. The first range is called the "root range".
 * @isBlockCoverage indicates if the function has block coverage information
 *   @false means that there is a single range and its count is the number of times the function was called.
 *   @true means that the ranges form a tree of blocks representing how many times each statement or expression inside was executed.
 *        It detects skipped or repeated statements. The root range counts the number of function calls.
 * @functionName can be an empty string. This is common for the FunctionCov representing the whole module.
 */
// https://github.com/bcoe/v8-coverage
/**
* @ranges is always non-empty. The first range is called the "root range".
* @isBlockCoverage indicates if the function has block coverage information.
    If this is false, it usually means that the functions was never called.
    It seems to be equivalent to ranges.length === 1 && ranges[0].count === 0.
* @functionName can be an empty string. This is common for the FunctionCov representing the whole module.
*/

// if you have a line of code that says `var x= 10; console.log(x);` that's one line and 2 statements.

const path = require('path');

const Util = require('../utils/util.js');
const decodeMappings = require('../utils/decode-mappings.js');

// position mapping for conversion between offset and line/column
const { Locator } = require('monocart-formatter');
const findOriginalRange = require('./find-original-range.js');
const { getJsAstInfo, getCssAstInfo } = require('./ast.js');
const { getIgnoredRanges } = require('./ignore.js');

const { dedupeCountRanges } = require('../utils/dedupe.js');
const { getSourceType, initSourceMapSourcePath } = require('../utils/source-path.js');

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
const collectFileCoverage = (item, state, coverageData, options) => {

    const { sourcePath } = item;
    const {
        bytes,
        functions,
        branches,
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

    // branch group with locations to flat branches
    data.branches = branches.map((info) => {
        return info.getRanges();
    }).flat();

    // ==========================================
    // lines
    // after bytes with ignored, before calculateV8Lines
    const {
        lines, blankCount, commentCount
    } = handleLinesCoverage(data.bytes, locator);

    // ==========================================
    // v8 data and summary
    item.data = data;
    item.summary = {
        functions: calculateV8Functions(data.functions),
        branches: calculateV8Branches(data.branches),
        lines: calculateV8Lines(lines, blankCount, commentCount)
    };

    // ==========================================
    // istanbul
    const istanbulCoverage = {
        path: sourcePath,

        statementMap: {},
        fnMap: {},
        branchMap: {},

        s: {},
        f: {},
        b: {}
    };

    lines.filter((it) => !it.ignored).forEach((line, index) => {
        istanbulCoverage.statementMap[`${index}`] = line.generate();
        istanbulCoverage.s[`${index}`] = line.count;
    });

    functions.filter((it) => !it.ignored).forEach((fn, index) => {
        istanbulCoverage.fnMap[`${index}`] = fn.generate(locator);
        istanbulCoverage.f[`${index}`] = fn.count;
    });

    branches.filter((it) => !it.ignored).forEach((branch, index) => {
        const { map, counts } = branch.generate(locator);
        istanbulCoverage.branchMap[`${index}`] = map;
        istanbulCoverage.b[`${index}`] = counts;
    });

    // append to dist file state
    coverageData[sourcePath] = istanbulCoverage;

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

const decodeSourceMappings = async (state, originalDecodedMap) => {

    const generatedLocator = state.locator;

    const { sources, mappings } = state.sourceMap;

    const decodedList = await decodeMappings(mappings);

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

    if (!decodeMappings) {
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

    const fileSources = state.fileSources;

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

        // keep original formatted content
        fileSources[sourcePath] = sourceContent;

        const locator = new Locator(sourceContent);

        const decodedMappings = getOriginalDecodedMappings(originalDecodedMap, sourceIndex, locator);

        // unpacked file always is js

        const type = getSourceType(sourcePath);

        const originalState = {
            original: true,
            // only js sourceMap for now
            js: true,
            type,
            sourcePath,
            source: sourceContent,
            locator,
            decodedMappings,
            // coverage info
            bytes: [],
            functions: [],
            branches: [],
            astInfo: {
                functions: [],
                branches: []
            }
        };

        originalMap.set(sourceIndex, originalState);
    });

    return originalMap;
};

const collectOriginalList = (item, state, originalMap, options) => {

    const { fileUrls, sourceMap } = state;
    const distFile = sourceMap.file || path.basename(item.sourcePath);

    // collect original files
    const sourceList = [];

    originalMap.forEach((originalState) => {

        const {
            js, type, sourcePath, source
        } = originalState;

        // add file item
        const url = fileUrls[sourcePath] || sourcePath;

        // add dist for id
        const id = Util.calculateSha1(distFile + sourcePath + source);

        const sourceItem = {
            url,
            id,
            js,
            type,
            sourcePath,
            distFile,
            source
        };

        // generate coverage for current file, state for dist file
        collectFileCoverage(sourceItem, originalState, state.coverageData, options);

        sourceList.push(sourceItem);
    });

    return sourceList;
};

// ========================================================================================================

const generateCoverageForDist = (item, state, options) => {

    handleFunctionsCoverage(state);
    handleBranchesCoverage(state);
    handleBytesCoverage(state);

    collectFileCoverage(item, state, state.coverageData, options);

};

const unpackSourceMap = async (item, state, options) => {

    const { sourcePath } = item;
    const sourceMap = state.sourceMap;

    // keep original urls
    const fileUrls = {};
    const sourcePathHandler = options.sourcePath;
    initSourceMapSourcePath(sourceMap, fileUrls, sourcePathHandler);
    state.fileUrls = fileUrls;

    // ===============================================
    // decode mappings for each original file
    const time_start_decode = Date.now();
    const originalDecodedMap = new Map();
    // for find-original-range
    state.decodedMappings = await decodeSourceMappings(state, originalDecodedMap);
    // only debug level
    Util.logTime(`decode source mappings: ${sourcePath}`, time_start_decode);

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
    state.sourceList = collectOriginalList(item, state, originalMap, options);

};

const unpackDistFile = async (item, state, options) => {

    if (state.sourceMap) {
        if (Util.loggingType === 'debug') {
            // js self
            item.debug = true;
            generateCoverageForDist(item, state, options);
        } else {
            item.dedupe = true;
        }

        // unpack source map
        await unpackSourceMap(item, state, options);

    } else {

        // css/js self
        generateCoverageForDist(item, state, options);

    }

};

// ========================================================================================================

const dedupeV8List = (v8list) => {
    const indexes = [];
    v8list.forEach((item, i) => {
        if (item.dedupe) {
            indexes.push(i);
        }
    });
    if (indexes.length) {
        indexes.reverse();
        indexes.forEach((i) => {
            v8list.splice(i, 1);
        });
    }
};

const convertV8List = async (v8list, options) => {

    // global file sources and coverage
    const fileSources = {};
    const coverageData = {};
    let sourceList = [];

    for (const item of v8list) {
        // console.log([item.id]);

        const {
            type, source, sourcePath
        } = item;

        // for source file, type could be ts or vue as extname, but js = true
        const js = type === 'js';
        item.js = js;

        // append file source
        fileSources[sourcePath] = source;

        // source mapping
        const locator = new Locator(source);

        // ============================
        // move  sourceMap
        const sourceMap = item.sourceMap;
        if (sourceMap) {
            delete item.sourceMap;
        }

        // ============================
        // move functions and ranges to coverageList
        let coverageList = [];
        let astInfo;
        if (js) {
            coverageList = item.functions;
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
        const state = {
            js,
            type,
            sourcePath,
            sourceMap,
            coverageList,
            locator,
            // coverage info
            bytes: [],
            functions: [],
            branches: [],
            astInfo,
            // for istanbul
            fileSources: {},
            coverageData: {}
        };

        await unpackDistFile(item, state, options);

        // merge state
        Object.assign(fileSources, state.fileSources);
        Object.assign(coverageData, state.coverageData);

        if (Util.isList(state.sourceList)) {
            sourceList = sourceList.concat(state.sourceList);
        }

    }

    // add all sources
    if (sourceList.length) {
        sourceList.forEach((item) => {

            // second time filter for empty source
            // exists same id, mark previous item as dedupe
            const prevItem = v8list.find((it) => it.id === item.id);
            if (prevItem) {
                prevItem.dedupe = true;
            }

            v8list.push(item);
        });
    }

    // dedupe
    dedupeV8List(v8list);

    return {
        fileSources,
        coverageData
    };

};

module.exports = {
    convertV8List
};
