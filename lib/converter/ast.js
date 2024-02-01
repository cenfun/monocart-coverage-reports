const {
    acorn, acornLoose, parseCss
} = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const {
    visitFunctionBody, visitFunctionParams,
    generateBranches
} = require('./ast-function.js');

const getFunctionRange = (start, end, countInfo) => {

    const {
        functionMap, functionNameMap, functionUncoveredRanges
    } = countInfo;

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

    // find in uncoveredRanges
    return Util.findInRanges(start, end, functionUncoveredRanges, 'startOffset', 'endOffset');
};

const collectFunctionNodes = (ast) => {
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
        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node, parents) {
            const reverseParents = [].concat(parents).reverse();
            functionNodes.push({
                node,
                reverseParents
            });
        }
    });
    return functionNodes;
};

const collectAstInfo = (ast, countInfo) => {

    const functionNodes = collectFunctionNodes(ast);

    const outputInfo = {
        branchMap: new Map(),
        // locationMap for chain LogicalExpression locations
        locationMap: new Map(),
        statementList: []
    };

    // root function branches
    const rootFunction = countInfo.rootFunction;
    if (rootFunction) {
        const functionInfo = {
            count: rootFunction.count,
            range: rootFunction
        };
        visitFunctionBody(functionInfo, outputInfo, ast);
    }

    const functions = [];
    functionNodes.forEach((item) => {
        const { node } = item;
        const {
            start, end, id
        } = node;
        const functionName = id && id.name;

        const functionInfo = {
            start,
            end,
            functionName,
            count: 1
        };

        const isWrap = Boolean(node._wrapKey);

        if (isWrap) {
            functionInfo.wrap = true;
        }

        const functionRange = getFunctionRange(start, end, countInfo);
        if (functionRange) {
            if (isWrap) {
                functionRange.wrap = true;
            }
            functionInfo.range = functionRange;
            functionInfo.count = functionRange.count;
        }

        functions.push(functionInfo);

        // function params
        visitFunctionParams(functionInfo, outputInfo, node.params);
        // function body
        visitFunctionBody(functionInfo, outputInfo, node.body);
    });

    const { branchMap, statementList } = outputInfo;
    const branches = generateBranches(branchMap);
    const statements = statementList;

    return {
        functions,
        branches,
        statements
    };

};

const getCountInfo = (coverageList) => {
    const functionMap = new Map();
    const functionNameMap = new Map();
    const functionUncoveredRanges = [];
    let rootFunction;
    coverageList.forEach((block) => {
        const {
            functionName, ranges, root
        } = block;

        let functionRange;
        const blockRanges = [];

        ranges.forEach((range, i) => {
            if (i === 0) {
                // function range
                functionRange = range;
                return;
            }
            blockRanges.push(range);
        });

        functionRange.functionName = functionName;

        // blocks
        if (blockRanges.length) {
            blockRanges.sort((a, b) => {
                return a.startOffset - b.startOffset;
            });
            const blockMap = new Map();
            blockRanges.forEach((item) => {
                blockMap.set(item.startOffset, item);
            });
            functionRange.blockMap = blockMap;
            // uncovered is unique
            functionRange.blockUncoveredRanges = blockRanges.filter((it) => it.count === 0);
            functionRange.blockRanges = blockRanges;
        }

        // root function
        if (root) {
            rootFunction = functionRange;
            return;
        }

        functionMap.set(functionRange.startOffset, functionRange);
        if (functionName) {
            functionNameMap.set(functionRange.startOffset + functionName.length, functionRange);
        }

        // uncovered is unique
        if (functionRange.count === 0) {
            functionUncoveredRanges.push(functionRange);
        }

    });

    // sort ranges
    functionUncoveredRanges.sort((a, b) => {
        return a.startOffset - b.startOffset;
    });

    return {
        functionMap,
        functionNameMap,
        functionUncoveredRanges,
        rootFunction
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

    const countInfo = getCountInfo(coverageList);
    // countInfo.item = item;

    return collectAstInfo(ast, countInfo);
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
