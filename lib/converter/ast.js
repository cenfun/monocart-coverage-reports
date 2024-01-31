const {
    acorn, acornLoose, parseCss
} = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const {
    getNodeCount, getBlockRange,
    visitFunctionBody, visitFunctionParams,
    generateBranches, generateStatements
} = require('./ast-function.js');

const getFunctionRange = (start, end, countCache) => {

    const {
        functionMap, functionNameMap, functionRanges
    } = countCache;

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
    return Util.findInRanges(start, end, functionRanges, 'startOffset', 'endOffset');
};

const addStatementCount = (node, reverseParents, functionRoot) => {

    // already added, could be function statement
    if (node._state) {
        return;
    }

    // find parent function
    const parentFunction = reverseParents.find((it) => it._state && it._state.range);
    if (parentFunction) {
        const functionRange = parentFunction._state.range;
        const blockRange = getBlockRange(node, functionRange);
        if (blockRange) {
            // block count
            node._state = {
                count: blockRange.count
            };
            return;
        }
    }

    // find root function
    if (functionRoot) {
        // function range for root, vm mode, the root function has been removed
        const blockRange = getBlockRange(node, functionRoot);
        if (blockRange) {
            // root block count
            node._state = {
                count: blockRange.count
            };
            return;
        }
    }

    // find any parent statement
    const parentStatement = reverseParents.find((it) => it._state);
    if (parentStatement) {
        node._state = {
            count: parentStatement._state.count
        };
    }

};

const collectNodes = (ast) => {
    const statementNodes = [];
    const functionNodes = [];

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

        Statement: (node, parents) => {
            const reverseParents = [].concat(parents).reverse();
            statementNodes.push({
                node,
                reverseParents
            });
        },

        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node, parents) {
            const reverseParents = [].concat(parents).reverse();
            functionNodes.push({
                node,
                reverseParents
            });
        }

    });

    return {
        statementNodes,
        functionNodes
    };

};

const collectAstInfo = (ast, countCache) => {

    const { statementNodes, functionNodes } = collectNodes(ast);

    functionNodes.forEach((item) => {
        const { node } = item;
        const { start, end } = node;
        const range = getFunctionRange(start, end, countCache);
        if (range) {

            if (node._wrapKey) {
                range.wrap = true;
            }

            // function count and range state
            node._state = {
                count: range.count,
                range
            };
        }
    });

    const functionRoot = countCache.functionRoot;
    statementNodes.forEach((item) => {
        const { node, reverseParents } = item;
        addStatementCount(node, reverseParents, functionRoot);
    });

    // branch map
    const branchMap = new Map();
    // locationMap for chain LogicalExpression locations
    const locationMap = new Map();

    // root function branches
    if (functionRoot) {
        const rootFunctionInfo = {
            count: functionRoot.count,
            range: functionRoot
        };
        visitFunctionBody(rootFunctionInfo, branchMap, locationMap, ast);
    }

    const functions = [];
    functionNodes.forEach((item) => {
        const { node } = item;
        const {
            start, end, id, _state
        } = node;
        const functionName = id && id.name;

        const count = getNodeCount(item, functionRoot);

        const functionInfo = {
            start,
            end,
            functionName,
            count
        };

        if (node._wrapKey) {
            functionInfo.wrap = true;
        }

        if (_state) {
            functionInfo.range = _state.range;
        }

        functions.push(functionInfo);

        // function params
        const parents = [node];
        visitFunctionParams(functionInfo, branchMap, locationMap, node.params, parents);

        // function body
        visitFunctionBody(functionInfo, branchMap, locationMap, node.body);
    });

    const branches = generateBranches(branchMap);
    const statements = generateStatements(statementNodes, functionRoot);

    return {
        functions,
        branches,
        statements
    };

};

const generateCountCache = (coverageList) => {
    const functionRanges = [];
    const functionNameMap = new Map();
    let functionRoot;
    coverageList.forEach((block) => {
        const {
            functionName, ranges, root
        } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        functionRange.functionName = functionName;

        // blocks
        const len = ranges.length;
        if (len > 1) {
            const functionBlockRanges = [].concat(ranges);
            // remove first one
            functionBlockRanges.shift();
            functionBlockRanges.sort((a, b) => {
                return a.startOffset - b.startOffset;
            });
            const blockMap = new Map();
            functionBlockRanges.forEach((item) => {
                blockMap.set(item.startOffset, item);
            });
            functionRange.blockMap = blockMap;
            functionRange.blockRanges = functionBlockRanges;
        }

        // root function
        if (root) {
            functionRoot = functionRange;
            return;
        }

        if (functionName) {
            functionNameMap.set(functionRange.startOffset + functionName.length, functionRange);
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
        functionRanges,
        functionRoot
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
        Util.logInfo(`failed to parse source file: ${item.sourcePath} ${e.message}`);
        // https://github.com/acornjs/acorn/tree/master/acorn-loose
        // It is recommended to always try a parse with the regular acorn parser first,
        // and only fall back to this parser when that one finds syntax errors.
        ast = acornLoose.parse(source, options);
    }

    const countCache = generateCountCache(coverageList);
    // countCache.item = item;

    return collectAstInfo(ast, countCache);
};

// =========================================================================================================

const addRule = (item, coverageList, coveredRanges, count = 0) => {

    const { source } = item;
    const { start, end } = source;
    const startOffset = start.offset;
    const endOffset = end.offset;

    if (!count) {
        const coveredRange = Util.findInRanges(startOffset, endOffset, coveredRanges, 'startOffset', 'endOffset');
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
        branches: [],
        statements: []
    };
};


module.exports = {
    getJsAstInfo,
    getCssAstInfo
};
