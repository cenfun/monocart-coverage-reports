const path = require('path');

const { acornLoose, acornWalk } = require('../packages/monocart-coverage-vendor.js');

const Util = require('../utils/util.js');
const decodeMappings = require('../utils/decode-mappings.js');

// position mapping for conversion between offset and line/column
const PositionMapping = require('./position-mapping.js');
const findOriginalRange = require('./find-original-range.js');

const { dedupeCountRanges } = require('./dedupe.js');
const { getSourceType, initSourceMapSourcePath } = require('./source-path.js');

const InfoLine = require('./info-line.js');
const InfoBranch = require('./info-branch.js');
const InfoFunction = require('./info-function.js');

// ========================================================================================================

const initAstCoverage = (coverageList, ast, functions) => {

    const countMap = new Map();
    coverageList.forEach((block) => {
        const { functionName, ranges } = block;
        // first one is function coverage info
        const range = ranges[0];
        const { startOffset } = range;
        countMap.set(startOffset, {
            functionName,
            ... range
        });
    });

    acornWalk.simple(ast, {
        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node) {
            const functionName = node.id && node.id.name;
            functions.push({
                start: node.start,
                end: node.end,
                functionName
            });
        }

        // branches

    });

    functions.sort((a, b) => {
        return a.start - b.start;
    });

    // console.log(countMap);

    functions.forEach((fun) => {
        const countInfo = countMap.get(fun.start);
        if (countInfo) {
            fun.count = countInfo.count;
        } else {
            fun.count = 0;
            // console.log('uncovered', fun);
        }
    });

    // console.log(functions);

};

const getAstInfo = (source, js, coverageList) => {

    // css also support, but css need handle something like: @charset "UTF-8";
    const comments = [];
    const ast = acornLoose.parse(source, {
        ecmaVersion: 'latest',
        onComment: (block, text, start, end) => {
            // console.log(type, text, start, end);
            comments.push({
                block,
                start,
                end
            });
        }
    });
    comments.sort((a, b) => {
        return a.start - b.start;
    });

    const functions = [];
    if (js) {
        initAstCoverage(coverageList, ast, functions);
    }

    return {
        comments,
        functions
    };
};


const updateLineComment = (positionMapping, range) => {
    const {
        block, start, end
    } = range;

    const sLoc = positionMapping.offsetToLocation(start);
    const eLoc = positionMapping.offsetToLocation(end);

    const lines = Util.getRangeLines(sLoc, eLoc, block);

    lines.forEach((it) => {
        if (!it.entire) {
            return;
        }
        const line = positionMapping.getLine(it.line);
        // blank in block comment count as blank
        if (line && !line.blank) {
            line.comment = true;
        }
    });

};

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

    // console.log(functions);

    return v8Functions;
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

    // comments ranges from ast
    const comments = [];

    const branches = [];

    // functions ranges from ast
    const functions = [];

    const lines = [];
    // line 1 based
    const lineMap = new Map();

    const blankCount = 0;
    const commentCount = 0;

    // coverage ranges from coverage API
    const ranges = [];

    return {
        // v8
        comments,
        ranges,

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
        comments,
        ranges,

        // istanbul
        branches,

        functions,

        lines,
        blankCount,
        commentCount

    } = coverageInfo;

    // ==========================================
    // v8
    item.ranges = dedupeCountRanges(ranges);
    item.comments = comments;
    item.summary = {
        functions: calculateV8Functions(functions),
        lines: calculateV8Lines(lines, blankCount, commentCount)
    };

    // ==========================================
    // istanbul
    const istanbulCoverage = {
        path: sourcePath,

        statementMap: {},
        s: {},

        fnMap: {},
        f: {},

        branchMap: {},
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
        istanbulCoverage.b[`${index}`] = [branch.count];
    });

    // append to dist file state
    state.coverageData[sourcePath] = istanbulCoverage;

};

// ========================================================================================================


// check first function in original source
// it could be the parent wrap function, should be removed
const isWrapFunction = (positionMapping, start, end) => {
    const left = positionMapping.getSlice(0, start);
    const right = positionMapping.getSlice(end);
    if (Util.isBlank(left) && Util.isBlank(right)) {
        // console.log('=================================', state.sourcePath);
        return true;
    }
};


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

const addJsCoverage = (state, block, range, index) => {

    const { positionMapping, coverageInfo } = state;

    const {
        branches, ranges, lineMap
    } = coverageInfo;

    const {
        startOffset, endOffset, count
    } = range;

    // check first range
    if (!ranges.length) {
        if (isWrapFunction(positionMapping, startOffset, endOffset)) {
            return;
        }
    }

    const { isBlockCoverage } = block;

    ranges.push({
        start: startOffset,
        end: endOffset,
        count
    });

    const sLoc = positionMapping.offsetToLocation(startOffset);
    const eLoc = positionMapping.offsetToLocation(endOffset);


    // update lines coverage
    const lines = Util.getRangeLines(sLoc, eLoc);


    lines.forEach((it) => {
        const line = lineMap.get(it.line);
        if (!line) {
            return;
        }

        // from outside into inside, uncovered is certain
        // default is covered
        if (line.covered) {
            line.covered = count > 0;
        }

        line.count = count;

        // if (!line.history) {
        //     line.history = [];
        // }
        // line.history.push(`${it.entire}-${count}`);

    });

    // update branches - istanbul only
    if (isBlockCoverage) {
        // the ranges form a tree of blocks representing how many times each statement or expression inside was executed.
        // It detects skipped or repeated statements.

        if (index === 0) {
            // The root range counts the number of function calls

        }

        // index 0 not really a branch, but for covered whole function
        branches.push(new InfoBranch(sLoc, eLoc, count));

    } else {
        // there is a single range and its count is the number of times the function was called.

    }

};

const addCssCoverage = (coverageInfo, range, positionMapping) => {
    const { lineMap, ranges } = coverageInfo;

    // keep css ranges
    ranges.push(range);

    const { start, end } = range;

    const sLoc = positionMapping.offsetToLocation(start);
    const eLoc = positionMapping.offsetToLocation(end);

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

const handleFunctionsCoverage = (state) => {

    // functions only for js
    if (!state.js) {
        return;
    }

    const {
        original, positionMapping, coverageInfo, astInfo
    } = state;

    const functions = coverageInfo.functions;
    astInfo.functions.forEach((it, i) => {
        const {
            start, end, functionName, count
        } = it;

        // check first function
        if (original && i === 0) {
            if (isWrapFunction(positionMapping, start, end)) {
                return;
            }
        }

        const sLoc = positionMapping.offsetToLocation(start);
        const eLoc = positionMapping.offsetToLocation(end);
        const functionInfo = new InfoFunction(sLoc, eLoc, count, functionName);
        functions.push(functionInfo);
    });

};

const handleLinesCoverage = (state) => {

    const {
        js, positionMapping, coverageInfo, astInfo
    } = state;

    const lines = coverageInfo.lines;
    const lineMap = coverageInfo.lineMap;

    // init lines
    let blankCount = 0;
    let commentCount = 0;

    // handle comment before collect lines
    const comments = astInfo.comments;

    // keep comments ranges for UI (after pretty print)
    coverageInfo.comments = comments;

    // console.log('comments =================', item.sourcePath, comments.length);
    // add comment marked to lines
    comments.forEach((range) => {
        updateLineComment(positionMapping, range);
    });


    // js: 1 (functions include all uncovered)
    // css: 0 (ranges include all covered)
    const baseLineCount = js ? 1 : 0;

    positionMapping.lines.forEach((it) => {
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

    const {
        js, positionMapping, coverageInfo, coverageList
    } = state;

    if (js) {
        coverageList.forEach((block) => {
            block.ranges.forEach((range, index) => {
                addJsCoverage(state, block, range, index);
            });
        });

    } else {
        coverageList.forEach((range) => {
            addCssCoverage(coverageInfo, range, positionMapping);
        });
    }

    // if (item.sourcePath.indexOf('demo.js') !== -1) {
    //     console.log(coverage.lines);
    // }
};

const generateCoverageForDist = (item, state) => {

    // handle coverage
    handleFunctionsCoverage(state);
    handleLinesCoverage(state);
    handleRangesCoverage(state);

    collectFileCoverage(item, state.coverageInfo, state);

};

// ========================================================================================================

const decodeSourceMappings = async (item, state, originalDecodedMap) => {

    const generatedPositionMapping = state.positionMapping;

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
            const generatedOffset = generatedPositionMapping.locationToOffset({
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
            const line = generatedPositionMapping.getLine(info.generatedLine + 1);
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

const getOriginalDecodedMappings = (originalDecodedMap, sourceIndex, positionMapping) => {
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
        item.originalOffset = positionMapping.locationToOffset({
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

        const positionMapping = new PositionMapping(sourceContent);

        const decodedMappings = getOriginalDecodedMappings(originalDecodedMap, sourceIndex, positionMapping);

        // unpacked file always is js

        const type = getSourceType(sourcePath);

        const originalState = {
            original: true,
            // only js sourceMap for now
            js: true,
            type,
            sourcePath,
            source: sourceContent,
            positionMapping,
            decodedMappings,
            coverageInfo: createEmptyCoverageInfo(),
            astInfo: {
                comments: [],
                functions: []
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

    // function count
    state.astInfo.functions.forEach((it) => {
        const { start, end } = it;

        // rename to startOffset and endOffset
        const range = {
            startOffset: start,
            endOffset: end
        };

        const result = findOriginalRange(range, state, originalMap);
        if (!result) {
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

    });

};

const handleOriginalLinesCoverage = (state, originalMap) => {
    // comment count
    state.astInfo.comments.forEach((it) => {
        const { start, end } = it;

        // rename to startOffset and endOffset
        const range = {
            startOffset: start,
            endOffset: end
        };

        const result = findOriginalRange(range, state, originalMap);
        if (!result) {
            return;
        }
        const { originalRange, originalState } = result;
        const oComment = {
            ... it,
            generatedStart: start,
            generatedEnd: end,
            start: originalRange.startOffset,
            end: originalRange.endOffset
        };

        // fix end
        // if block comment, must be started with /*  and end with */
        // if (it.block) {
        //     const str = originalState.positionMapping.getSlice(oComment.start, oComment.end).trim();
        //     if (!str.startsWith('/*') || !str.endsWith('*/')) {
        //         console.log('-----------------------------', originalState.sourcePath);
        //         console.log(it);
        //         console.log(result.startMapping, result.endMapping);
        //         EC.logCyan(`'${str}'`);
        //     }
        // }

        // if (originalState.sourcePath.endsWith('comments.js')) {
        //     console.log('============================================');
        //     console.log(result.startMapping, result.endMapping);
        // }

        // add back to original ast
        originalState.astInfo.comments.push(oComment);

    });

};

const handleOriginalRangesCoverage = (state, originalMap) => {

    const { js, coverageList } = state;

    // const time_start_mapping = Date.now();
    if (js) {
        // v8 coverage
        coverageList.forEach((block) => {
            block.ranges.forEach((range, index) => {
                const result = findOriginalRange(range, state, originalMap);
                if (!result) {
                    return;
                }

                const { originalRange, originalState } = result;
                addJsCoverage(originalState, block, originalRange, index);

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

    // handle functions and comments before handle original state functions
    handleOriginalFunctionsCoverage(state, originalMap);
    handleOriginalLinesCoverage(state, originalMap);

    // handle lines info before handle ranges to update line count
    originalMap.forEach((originalState) => {
        handleFunctionsCoverage(originalState);
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
        const positionMapping = new PositionMapping(source);

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
            // clean functions after all
            if (Util.loggingType !== 'debug') {
                delete item.functions;
            }
        } else {
            coverageList = item.ranges;
            // no need remove for css, it's ready for UI
        }

        // ============================
        const coverageInfo = createEmptyCoverageInfo();

        // ============================
        const astInfo = getAstInfo(source, js, coverageList);

        // current file and it's sources from sourceMap
        const state = {
            js,
            type,
            sourcePath,
            sourceMap,
            coverageList,
            positionMapping,
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
