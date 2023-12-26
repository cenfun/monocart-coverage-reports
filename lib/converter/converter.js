const path = require('path');

const Util = require('../utils/util.js');
const decodeMappings = require('../utils/decode-mappings.js');

// position mapping for conversion between offset and line/column
const { Locator } = require('monocart-formatter/node');
const findOriginalRange = require('./find-original-range.js');
const { getAstInfo } = require('./ast.js');

const { dedupeCountRanges } = require('./dedupe.js');
const { getSourceType, initSourceMapSourcePath } = require('./source-path.js');

const InfoLine = require('./info-line.js');
const InfoBranch = require('./info-branch.js');
const InfoFunction = require('./info-function.js');

// ========================================================================================================

const calculateV8Functions = (functions) => {

    const v8Functions = {
        total: 0,
        covered: 0
    };

    functions.forEach((fn) => {
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
        branch.locations.forEach((location) => {
            v8Branches.total += 1;
            if (location.count > 0) {
                v8Branches.covered += 1;
            }
        });
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
        v8Lines.total += 1;
        // full line covered
        if (ln.covered) {
            v8Lines.covered += 1;
        }
    });

    return v8Lines;
};

const createEmptyCoverageInfo = () => {

    // data for v8 UI
    const data = {
        bytes: [],
        functions: [],
        branches: []
    };

    const branches = [];

    const functions = [];

    const lines = [];
    // line 1 based
    const lineMap = new Map();

    const blankCount = 0;
    const commentCount = 0;


    return {
        // v8
        data,

        // istanbul
        branches,

        functions,

        lines,
        lineMap,
        blankCount,
        commentCount

    };
};

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
const collectFileCoverage = (item, coverageInfo, state) => {

    const { sourcePath } = item;

    const {
        // v8
        data,

        // istanbul
        branches,

        functions,

        lines,
        blankCount,
        commentCount

    } = coverageInfo;

    // ==========================================
    // v8
    data.bytes = dedupeCountRanges(data.bytes);
    item.data = data;
    item.summary = {
        functions: calculateV8Functions(functions),
        branches: calculateV8Branches(branches),
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

    lines.forEach((line, index) => {
        istanbulCoverage.statementMap[`${index}`] = line.generate();
        istanbulCoverage.s[`${index}`] = line.count;
    });

    functions.forEach((fn, index) => {
        istanbulCoverage.fnMap[`${index}`] = fn.generate();
        istanbulCoverage.f[`${index}`] = fn.count;
    });

    branches.forEach((branch, index) => {
        istanbulCoverage.branchMap[`${index}`] = branch.generate();
        istanbulCoverage.b[`${index}`] = branch.generateCounts();
    });

    // append to dist file state
    state.coverageData[sourcePath] = istanbulCoverage;

};

// ========================================================================================================

// https://github.com/demurgos/v8-coverage
/**
 * @ranges is always non-empty. The first range is called the "root range".
 * @isBlockCoverage indicates if the function has block coverage information
 *   @false means that there is a single range and its count is the number of times the function was called.
 *   @true means that the ranges form a tree of blocks representing how many times each statement or expression inside was executed.
 *        It detects skipped or repeated statements. The root range counts the number of function calls.
 *
 * @functionName can be an empty string. This is common for the FunctionCov representing the whole module.
 */
// if you have a line of code that says `var x= 10; console.log(x);` that's one line and 2 statements.

const addJsLineCoverage = (state, range) => {

    const { locator, coverageInfo } = state;

    const { data, lineMap } = coverageInfo;

    const {
        startOffset, endOffset, count
    } = range;

    // add bytes range
    data.bytes.push({
        // index,
        start: startOffset,
        end: endOffset,
        count
    });

    const sLoc = locator.offsetToLocation(startOffset);
    const eLoc = locator.offsetToLocation(endOffset);

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
        } else {
            if (count > 0) {
                line.count = count;
            } else {
                // not covered if any count = 0
                line.covered = false;
            }
        }

        // if (!line.history) {
        //     line.history = [];
        // }
        // line.history.push(`${it.entire}-${count}`);

    });

    // if (state.sourcePath.endsWith('component.js')) {
    //     console.log('===========================================', state.sourcePath);
    //     console.log(coverageInfo.lines);
    // }

};

const addCssLineCoverage = (state, range) => {

    const { coverageInfo, locator } = state;

    const { lineMap, data } = coverageInfo;

    // add bytes range
    data.bytes.push(range);

    const { start, end } = range;

    const sLoc = locator.offsetToLocation(start);
    const eLoc = locator.offsetToLocation(end);

    // covered css lines
    const lines = Util.getRangeLines(sLoc, eLoc);
    lines.forEach((it) => {
        if (!it.entire) {
            return;
        }
        const line = lineMap.get(it.line);
        if (line) {
            // default is uncovered
            // count always 1, covered is certain
            line.covered = true;
        }
    });


};

// ========================================================================================================

const updateOffsetToLocation = (locator, loc) => {
    const sLoc = locator.offsetToLocation(loc.start);
    loc.start = {
        line: sLoc.line,
        column: sLoc.column
    };
    const eLoc = locator.offsetToLocation(loc.end);
    loc.end = {
        line: eLoc.line,
        column: eLoc.column
    };
};

const handleFunctionsCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const {
        locator, coverageInfo, astInfo
    } = state;

    const functions = coverageInfo.functions;
    astInfo.functions.forEach((it) => {
        const {
            start, end, functionName, count
        } = it;
        const loc = {
            start,
            end
        };
        updateOffsetToLocation(locator, loc);
        const functionInfo = new InfoFunction(loc, count, functionName);
        functions.push(functionInfo);
    });

    // if (state.sourcePath.endsWith('store.js')) {
    //     console.log('==========================================================');
    //     console.log(astInfo.functions);
    //     console.log(functions);
    // }

};

const handleBranchesCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const {
        locator, coverageInfo, astInfo
    } = state;

    const branches = coverageInfo.branches;
    astInfo.branches.forEach((it) => {

        const branchType = it.type;
        const branchLoc = {
            ... it.loc
        };
        updateOffsetToLocation(locator, branchLoc);

        // locations
        // [ { start:{line,column}, end:{line,column}, count }, ...]
        const locations = it.locations.map((oLoc) => {
            const newLoc = {
                ... oLoc
            };
            if (newLoc.none) {
                return newLoc;
            }

            updateOffsetToLocation(locator, newLoc);
            return newLoc;
        });

        const branchInfo = new InfoBranch(branchLoc, locations, branchType);
        branches.push(branchInfo);
    });


};

const handleLinesCoverage = (state) => {

    const {
        js, locator, coverageInfo
    } = state;

    const lines = coverageInfo.lines;
    const lineMap = coverageInfo.lineMap;

    // init lines
    let blankCount = 0;
    let commentCount = 0;

    // js: 1 (functions include all uncovered)
    // css: 0 (ranges include all covered)
    const baseLineCount = js ? 1 : 0;

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
        const lineInfo = new InfoLine(line, it.length, baseLineCount);
        lineMap.set(line, lineInfo);
        lines.push(lineInfo);
    });

    coverageInfo.blankCount = blankCount;
    coverageInfo.commentCount = commentCount;
};

const handleRangesCoverage = (state) => {

    const { js, coverageList } = state;

    if (js) {
        coverageList.forEach((block) => {
            block.ranges.forEach((range) => {
                addJsLineCoverage(state, range);
            });
        });

    } else {
        coverageList.forEach((range) => {
            addCssLineCoverage(state, range);
        });
    }

};

const generateCoverageForDist = (item, state) => {

    // handle coverage
    handleFunctionsCoverage(state);
    handleBranchesCoverage(state);
    handleLinesCoverage(state);
    handleRangesCoverage(state);

    collectFileCoverage(item, state.coverageInfo, state);

};

// ========================================================================================================

const decodeSourceMappings = async (item, state, originalDecodedMap) => {

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

const initOriginalList = (item, state, originalDecodedMap, options) => {

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
            coverageInfo: createEmptyCoverageInfo(),
            astInfo: {
                functions: [],
                branches: []
            }
        };

        originalMap.set(sourceIndex, originalState);
    });

    return originalMap;
};

const collectOriginalList = (item, state, originalMap) => {

    const { fileUrls, sourceMap } = state;
    const distFile = sourceMap.file || path.basename(item.sourcePath);

    // collect original files
    const sourceList = [];
    originalMap.forEach((originalState) => {

        const {
            js, type, sourcePath, source, coverageInfo
        } = originalState;

        // add file item
        const url = fileUrls[sourcePath] || sourcePath;
        const id = Util.calculateSha1(url + source);

        const sourceItem = {
            url,
            id,
            js,
            type,
            sourcePath,
            distFile,
            source
        };

        // generate coverage, coverageInfo for current file, state for dist file
        collectFileCoverage(sourceItem, coverageInfo, state);

        sourceList.push(sourceItem);
    });

    return sourceList;
};

// =======================================================================================

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

        const {
            type, loc, locations
        } = it;

        // rename to startOffset and endOffset
        const bRange = {
            startOffset: loc.start,
            endOffset: loc.end
        };

        // start
        const result = findOriginalRange(bRange, state, originalMap);
        if (result.error) {
            // not in the original files
            return;
        }
        const { originalRange, originalState } = result;

        const newBranchLoc = {
            start: originalRange.startOffset,
            end: originalRange.endOffset
        };

        let hasError;
        const newLocations = locations.map((oLoc) => {

            const newLoc = {
                ... oLoc
            };

            if (newLoc.none) {
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

            const oRage = res.originalRange;
            newLoc.start = oRage.startOffset;
            newLoc.end = oRage.endOffset;

            return newLoc;
        });

        if (hasError) {
            return;
        }

        // add back to original ast
        originalState.astInfo.branches.push({
            type,
            loc: newBranchLoc,
            locations: newLocations
        });

    });

};

const handleOriginalRangesCoverage = (state, originalMap) => {

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
                addJsLineCoverage(originalState, originalRange);

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
    state.decodedMappings = await decodeSourceMappings(item, state, originalDecodedMap);
    // only debug level
    Util.logTime(`decode source mappings: ${sourcePath}`, time_start_decode);

    // filter original list and init list
    const originalMap = initOriginalList(item, state, originalDecodedMap, options);

    originalDecodedMap.clear();

    // ===============================================

    // handle functions before handle original state functions
    handleOriginalFunctionsCoverage(state, originalMap);
    handleOriginalBranchesCoverage(state, originalMap);

    // handle lines info before handle ranges to update line count
    originalMap.forEach((originalState) => {
        handleFunctionsCoverage(originalState);
        handleBranchesCoverage(originalState);
        handleLinesCoverage(originalState);

        // console.log(originalState.sourcePath, '================================');
        // console.log(originalState.astInfo.functions);
        // console.log(originalState.source.length);
        // console.log(originalState.coverageInfo.functions);

        // if (originalState.sourcePath.endsWith('demo.js')) {
        //     console.log('=================================', originalState.sourcePath);
        //     console.log(originalState.coverageInfo.lineMap);
        // }

    });

    // handle ranges after lines ready
    handleOriginalRangesCoverage(state, originalMap);

    // collect coverage for original list
    state.sourceList = collectOriginalList(item, state, originalMap);

};

// ========================================================================================================

const unpackDistFile = async (item, state, options) => {

    if (state.sourceMap) {
        if (Util.loggingType === 'debug') {
            // js self
            generateCoverageForDist(item, state);
        } else {
            item.dedupe = true;
        }

        // unpack source map
        await unpackSourceMap(item, state, options);

    } else {

        // css/js self
        generateCoverageForDist(item, state);

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

    // global file sources and coverage data
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
        let coverageList;
        if (js) {
            coverageList = item.functions;
            // remove original functions
            if (Util.loggingType !== 'debug') {
                delete item.functions;
            }
        } else {
            coverageList = item.ranges;
            // remove original ranges
            if (Util.loggingType !== 'debug') {
                delete item.ranges;
            }
        }

        // ============================
        const coverageInfo = createEmptyCoverageInfo();

        // ============================
        const astInfo = getAstInfo(item, coverageList);

        // current file and it's sources from sourceMap
        const state = {
            js,
            type,
            sourcePath,
            sourceMap,
            coverageList,
            locator,
            coverageInfo,
            astInfo,
            // for istanbul data
            fileSources: {},
            coverageData: {}
        };

        await unpackDistFile(item, state, options);

        // merge state
        Object.assign(fileSources, state.fileSources);
        Object.assign(coverageData, state.coverageData);
        if (state.sourceList) {
            sourceList = sourceList.concat(state.sourceList);
        }

    }

    // dedupe
    dedupeV8List(v8list);

    // add all sources
    if (sourceList.length) {
        sourceList.forEach((item) => {
            v8list.push(item);
        });
    }

    return {
        fileSources,
        coverageData
    };

};

module.exports = {
    convertV8List
};
