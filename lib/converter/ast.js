const {
    acorn, acornLoose, parseCss
} = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const { createBranches, collectBranches } = require('./branches.js');
const findInRanges = require('./find-in-ranges.js');

const getFunctionRange = (start, end, state) => {

    const {
        functionMap, functionNameMap, functionRanges
    } = state;

    if (!functionRanges.length) {
        return;
    }

    // exact matched in functionMap
    const range = functionMap.get(start);
    if (range) {
        return range;
    }
    // exact matched in functionNameMap
    const nameRange = functionNameMap.get(start);
    if (nameRange) {
        return nameRange;
    }

    // find in functionRanges
    return findInRanges(start, end, functionRanges);
};

const collectAstInfo = (ast, state) => {

    const functions = [];
    const branchMap = new Map();

    Util.visitAst(ast, {

        VariableDeclarator(node, parents) {
            // id: { type: 'Identifier', name: '__webpack_modules__' },
            const name = node.id && node.id.name;
            if (name === '__webpack_modules__' && node.init) {
                // mark all as wrap function
                node.init.properties.forEach((it) => {
                    it.value._wrapKey = it.key && it.key.value;
                });
                // console.log('==========================', node.type);
                // console.log(name, parents.length);
            }
        },

        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node) {

            const {
                start, end, id
            } = node;
            const functionName = id && id.name;

            const functionInfo = {
                start,
                end,
                functionName,
                // js default to 1
                count: 1
            };

            if (node._wrapKey) {
                functionInfo.wrap = true;
            }

            const range = getFunctionRange(start, end, state);
            if (range) {
                functionInfo.count = range.count;
                functionInfo.range = range;
                // set wrap back to range
                if (functionInfo.wrap) {
                    range.wrap = true;
                }
            }

            functions.push(functionInfo);

            createBranches(node.body, functionInfo, branchMap);

        }

    });

    const branches = collectBranches(branchMap);

    return {
        functions,
        branches
    };

};

const generateCountState = (coverageList) => {
    const functionRanges = [];
    const functionNameMap = new Map();
    coverageList.forEach((block) => {
        const { functionName, ranges } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        functionRange.functionName = functionName;
        if (functionName) {
            functionNameMap.set(functionRange.startOffset + functionName.length, functionRange);
        }

        // blocks
        const len = ranges.length;
        if (len > 1) {
            const blockRanges = [].concat(ranges);
            // remove first one
            blockRanges.shift();
            blockRanges.sort((a, b) => {
                return a.startOffset - b.startOffset;
            });
            const blockMap = new Map();
            blockRanges.forEach((item) => {
                blockMap.set(item.startOffset, item);
            });
            functionRange.blockMap = blockMap;
            functionRange.blockRanges = blockRanges;
        }

        functionRanges.push(functionRange);

    });

    // sort ranges
    functionRanges.sort((a, b) => {
        return a.startOffset - b.startOffset;
    });

    // keep map index for exact search
    const functionMap = new Map();
    functionRanges.forEach((item) => {
        functionMap.set(item.startOffset, item);
    });

    return {
        functionMap,
        functionNameMap,
        functionRanges
    };

};

const getJsAstInfo = (item, coverageList) => {

    const { source } = item;

    const options = {
        ecmaVersion: 'latest',
        // most time for node.js file
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowSuperOutsideMethod: true,
        allowAwaitOutsideFunction: true,
        // first line: #!/usr/bin/env node
        allowHashBang: true
    };

    let ast;
    try {
        ast = acorn.parse(source, options);
    } catch (e) {
        Util.logError(`failed to parse source file and fall back to loose: ${item.sourcePath} ${e.message}`);
        // https://github.com/acornjs/acorn/tree/master/acorn-loose
        // It is recommended to always try a parse with the regular acorn parser first,
        // and only fall back to this parser when that one finds syntax errors.
        ast = acornLoose.parse(source, options);
    }

    const state = generateCountState(coverageList);
    // state.item = item;

    return collectAstInfo(ast, state);
};

// =========================================================================================================

const addRule = (item, coverageList, coveredRanges, count = 0) => {

    const { source } = item;
    const { start, end } = source;
    const startOffset = start.offset;
    const endOffset = end.offset;

    if (!count) {
        const coveredRange = findInRanges(startOffset, endOffset, coveredRanges);
        if (coveredRange) {
            count = 1;
        }
    }

    coverageList.push({
        start: startOffset,
        end: endOffset,
        count
    });

    return count;

};

const addAtRule = (item, coverageList, coveredRanges) => {
    const { name, nodes } = item;

    if (['charset', 'import', 'namespace'].includes(name)) {
        addRule(item, coverageList, coveredRanges, 1);
        return;
    }

    if (['media', 'supports', 'container', 'layer'].includes(name)) {

        const childCoverageList = [];
        const count = addCssRules(nodes, childCoverageList, coveredRanges);
        if (count) {

            coverageList.push({
                start: item.source.start.offset,
                end: childCoverageList[0].start,
                count: 1
            });

            let end;
            childCoverageList.forEach((it) => {
                coverageList.push(it);
                end = it.end;
            });

            coverageList.push({
                start: end,
                end: item.source.end.offset,
                count: 1
            });

            return;
        }

    }

    addRule(item, coverageList, coveredRanges);

};

const addCssRules = (list, coverageList, coveredRanges) => {

    let count = 0;

    // line and line is 1-base
    list.forEach((item) => {

        const { type } = item;

        if (type === 'comment') {
            return;
        }

        if (type === 'rule') {
            count += addRule(item, coverageList, coveredRanges);
            return;
        }

        // console.log('=============================================================================');
        // Object.keys(item).forEach((k) => {
        //     if (k === 'parent') {
        //         return;
        //     }
        //     if (k === 'raws') {
        //         return;
        //     }
        //     if (k === 'nodes') {
        //         console.log(k, item[k].length);
        //         return;
        //     }
        //     if (k === 'source') {
        //         console.log(k, item[k].start, item[k].end);
        //         return;
        //     }
        //     console.log(k, item[k]);
        // });

        if (type === 'atrule') {
            addAtRule(item, coverageList, coveredRanges);
        }

    });

    return count;
};

const getCssAstInfo = (item, coverageList) => {

    const {
        source, sourcePath, ranges
    } = item;

    // sort covered ranges
    ranges.sort((a, b) => a.start - b.start);

    // to offset covered ranges
    const coveredRanges = ranges.map((it) => {
        return {
            startOffset: it.start,
            endOffset: it.end
        };
    });

    const time_start_parse = new Date();
    const ast = parseCss(source);
    Util.logTime(`parse css: ${sourcePath}`, time_start_parse);

    // if (sourcePath.endsWith('style.css')) {
    addCssRules(ast.nodes, coverageList, coveredRanges);
    // }

    return {
        functions: [],
        branches: []
    };
};


module.exports = {
    getJsAstInfo,
    getCssAstInfo
};
