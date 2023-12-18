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

const getDistAstInfo = (item, state) => {
    const positionMapping = state.positionMapping;
    const source = positionMapping.source;
    const type = item.type;

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
    if (type === 'js') {
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

            // maybe branches later

        });
        functions.sort((a, b) => {
            return a.start - b.start;
        });
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

    lines.forEach((i) => {
        const line = positionMapping.getLine(i);
        if (line) {
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

    const positionMap = {};

    functions.forEach((fn) => {

        // same position means same function
        // coverage-v8/mock/src/demo.js
        // whole file will be called as a function, don't know why
        const position = `${fn.startLine}-${fn.startColumn}`;
        if (positionMap[position]) {
            return;
        }
        positionMap[position] = true;

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
        if (ln.count > 0) {
            v8Lines.covered += 1;
        }

    });

    return v8Lines;
};

const createEmptyCoverage = () => {

    // comments ranges from ast
    const comments = [];

    const branches = [];

    // functions ranges from ast
    const functions = [];
    const functionMap = new Map();

    const lines = [];
    const lineMap = new Map();

    const blankCount = 0;
    const commentCount = 0;

    // coverage ranges from coverage API
    const ranges = [];

    return {
        comments,

        branches,

        functions,
        functionMap,

        lines,
        lineMap,
        blankCount,
        commentCount,

        ranges
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
const getFileCoverage = (coverage, sourcePath) => {

    const {
        comments,

        branches,

        functions,

        lines,
        blankCount,
        commentCount,

        ranges

    } = coverage;

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

    // v8
    const v8Coverage = {
        ranges: dedupeCountRanges(ranges),
        comments,
        summary: {
            functions: calculateV8Functions(functions),
            lines: calculateV8Lines(lines, blankCount, commentCount)
        }
    };

    return {
        v8Coverage,
        istanbulCoverage
    };
};

// ========================================================================================================

const setLineCount = (lineMap, line, count) => {
    const lineInfo = lineMap.get(line);
    if (lineInfo) {
        lineInfo.count = count;
    }
};

const setSingleLineCount = (lineMap, sLoc, eLoc, count) => {
    // nothing between
    if (sLoc.column >= eLoc.column) {
        return;
    }

    // sometimes column > length
    if (sLoc.column <= sLoc.indent && eLoc.column >= eLoc.length) {
        // console.log('single', sLoc.line);
        setLineCount(lineMap, sLoc.line, count);
    }

};

const updateLinesCount = (lineMap, sLoc, eLoc, count) => {

    // single line
    if (sLoc.line === eLoc.line) {
        setSingleLineCount(lineMap, sLoc, eLoc, count);
        return;
    }

    const firstELoc = {
        ... sLoc,
        column: sLoc.length
    };
    setSingleLineCount(lineMap, sLoc, firstELoc, count);

    for (let i = sLoc.line + 1; i < eLoc.line; i++) {
        setLineCount(lineMap, i, count);
    }

    const lastSLoc = {
        ... eLoc,
        column: eLoc.indent
    };
    setSingleLineCount(lineMap, lastSLoc, eLoc, count);

};


const updateFunctionsCount = (coverage, sLoc, eLoc, count, functionName) => {
    if (!count) {
        return;
    }

    const { functionMap, functions } = coverage;

    // no functions
    if (!functions.length) {
        return;
    }

    const {
        line, column, length
    } = sLoc;

    const funLineMap = functionMap.get(line);
    if (!funLineMap) {


        // if (coverage.sourcePath.indexOf('fps-detector/src/index.js') !== -1) {
        // console.log('=======================================');
        // console.log(coverage.sourcePath, count);
        // console.log('find line', line, 'from', Array.from(functionMap.keys()));
        // }

        return;
    }

    // only one in line
    if (funLineMap.size === 1) {
        const functionInfo = funLineMap.values().next().value;
        functionInfo.count = count;
        return;
    }

    // find matched column
    const columns = [
        column,
        column - 1,
        column + 1
    ];

    // try starts with functionName if static function
    // static finalizeStyles(i) {
    if (functionName) {
        const nl = functionName.length;
        columns.push(column + nl);
        columns.push(column + nl - 1);
        columns.push(column + nl + 1);
    }

    const list = columns.filter((c) => c >= 0 && c <= length);

    for (const c of list) {
        const functionInfo = funLineMap.get(c);
        if (functionInfo) {
            functionInfo.count = count;
            return;
        }
    }


    // console.log('=======================================');
    // console.log(coverage.sourcePath, functionName, 'count', count, 'line', line);
    // console.log('find columns', list, 'from', Array.from(funLineMap.keys()));

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

const addJsCoverage = (coverage, block, range, index, positionMapping) => {

    const {
        branches, ranges, lineMap
    } = coverage;

    const { isBlockCoverage, functionName } = block;
    const {
        startOffset, endOffset, count
    } = range;

    ranges.push({
        start: startOffset,
        end: endOffset,
        count
    });

    const sLoc = positionMapping.offsetToLocation(startOffset);
    const eLoc = positionMapping.offsetToLocation(endOffset);

    // line, column
    updateLinesCount(lineMap, sLoc, eLoc, count);


    if (isBlockCoverage) {
        // the ranges form a tree of blocks representing how many times each statement or expression inside was executed.
        // It detects skipped or repeated statements.

        if (index === 0) {
            // The root range counts the number of function calls
            updateFunctionsCount(coverage, sLoc, eLoc, count, functionName);
        }

        // index 0 not really a branch, but for covered whole function
        branches.push(new InfoBranch(sLoc, eLoc, count));

    } else {
        // there is a single range and its count is the number of times the function was called.
        updateFunctionsCount(coverage, sLoc, eLoc, count, functionName);
    }

};

const addCssCoverage = (coverage, range, positionMapping) => {
    const { lineMap, ranges } = coverage;

    // keep css ranges
    ranges.push(range);

    const { start, end } = range;

    const sLoc = positionMapping.offsetToLocation(start);
    const eLoc = positionMapping.offsetToLocation(end);

    // line, column
    updateLinesCount(lineMap, sLoc, eLoc, 1);

};

// ========================================================================================================

const handleDistFunctionsCoverage = (item, state, coverage) => {

    // functions only for js
    if (item.type !== 'js') {
        return;
    }

    const { positionMapping, astInfo } = state;

    const functions = coverage.functions;
    const functionMap = coverage.functionMap;
    astInfo.functions.forEach((fun) => {
        const {
            start, end, functionName
        } = fun;
        const sLoc = positionMapping.offsetToLocation(start);
        const eLoc = positionMapping.offsetToLocation(end);
        const functionInfo = new InfoFunction(sLoc, eLoc, 0, functionName);

        const { line, column } = sLoc;

        // line: { column:  }
        let funLineMap = functionMap.get(line);
        if (!funLineMap) {
            funLineMap = new Map();
            functionMap.set(line, funLineMap);
        }
        funLineMap.set(column, functionInfo);

        functions.push(functionInfo);
    });

};

const handleDistLinesCoverage = (item, state, coverage) => {

    const { positionMapping, astInfo } = state;

    const lines = coverage.lines;
    const lineMap = coverage.lineMap;

    // init lines
    let blankCount = 0;
    let commentCount = 0;

    // baseLineCount:
    // js: 1 (functions include all uncovered)
    // css: 0 (ranges include all covered)
    const baseLineCount = item.type === 'js' ? 1 : 0;

    // handle comment before collect lines
    const comments = astInfo.comments;

    // keep comments ranges for UI (after pretty print)
    coverage.comments = comments;

    // console.log('comments =================', item.sourcePath, comments.length);
    // add comment marked to lines
    comments.forEach((range) => {
        updateLineComment(positionMapping, range);
    });

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

    coverage.blankCount = blankCount;
    coverage.commentCount = commentCount;
};

const handleDistRangesCoverage = (item, state, coverage) => {

    const { positionMapping } = state;

    if (item.type === 'js') {
        state.functions.forEach((block) => {
            block.ranges.forEach((range, index) => {
                addJsCoverage(coverage, block, range, index, positionMapping);
            });
        });
    } else {
        state.ranges.forEach((range) => {
            addCssCoverage(coverage, range, positionMapping);
        });
    }
};

const generateCoverageForDist = (item, state) => {

    const coverage = createEmptyCoverage();

    // handle coverage
    handleDistFunctionsCoverage(item, state, coverage);
    handleDistLinesCoverage(item, state, coverage);
    handleDistRangesCoverage(item, state, coverage);

    const sourcePath = item.sourcePath;
    const { v8Coverage, istanbulCoverage } = getFileCoverage(coverage, sourcePath);
    state.coverageData[sourcePath] = istanbulCoverage;
    item.ranges = v8Coverage.ranges;
    item.comments = v8Coverage.comments;
    item.summary = v8Coverage.summary;
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
        const coverage = createEmptyCoverage();

        const type = getSourceType(sourcePath);

        const originalState = {
            source: sourceContent,
            type,
            sourcePath,
            positionMapping,
            decodedMappings,
            coverage
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
            source, type, sourcePath, coverage
        } = originalState;

        // generate coverage
        const { v8Coverage, istanbulCoverage } = getFileCoverage(coverage, sourcePath);
        state.coverageData[sourcePath] = istanbulCoverage;
        const ranges = v8Coverage.ranges;
        const comments = v8Coverage.comments;
        const summary = v8Coverage.summary;

        // add file item
        const url = fileUrls[sourcePath] || sourcePath;
        const id = Util.calculateSha1(url + source);

        const sourceItem = {
            url,
            id,
            type,
            sourcePath,
            distFile,
            ranges,
            comments,
            summary,
            source
        };

        sourceList.push(sourceItem);
    });

    return sourceList;
};

const addCoverageForOriginal = (item, state, originalMap) => {
    const { type } = item;
    const astInfo = state.astInfo;

    // comment count //TODO
    astInfo.comments.forEach((comment) => {

    });

    // ===============================================
    // const time_start_mapping = Date.now();
    if (type === 'js') {

        // function count //TODO
        astInfo.functions.forEach((fun) => {

        });

        // v8 coverage
        state.functions.forEach((block) => {
            block.ranges.forEach((range, index) => {
                const result = findOriginalRange(range, state, originalMap);
                if (!result) {
                    return;
                }

                const { originalRange, originalState } = result;
                const { coverage, positionMapping } = originalState;
                addJsCoverage(coverage, block, originalRange, index, positionMapping);

            });
        });

    } else {
        // support css later
        // current css no sourceMap, so never come in
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

    // convert mapping
    addCoverageForOriginal(item, state, originalMap);

    // collect list
    state.sourceList = collectOriginalList(item, state, originalMap);

};

// ========================================================================================================

const unpackDistFile = async (item, state, options) => {

    // ast for dist file
    state.astInfo = getDistAstInfo(item, state);

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

        const positionMapping = new PositionMapping(source);

        // append file source
        fileSources[sourcePath] = source;

        // current file and it's sources from sourceMap
        const state = {
            fileSources: {},
            coverageData: {},
            positionMapping
        };

        // move functions and ranges
        if (type === 'js') {
            state.functions = item.functions;
            // clean functions after all
            if (Util.loggingType !== 'debug') {
                delete item.functions;
            }
        } else {
            state.ranges = item.ranges;
            // no need remove for css
        }

        // move  sourceMap
        const sourceMap = item.sourceMap;
        if (sourceMap) {
            state.sourceMap = sourceMap;
            delete item.sourceMap;
        }

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
