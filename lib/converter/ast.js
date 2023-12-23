const { acorn, acornLoose } = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

// =======================================================================================

const addUncoveredBlockRanges = (ranges, cache) => {
    // no blocks, first one is function range
    if (ranges.length < 2) {
        return;
    }

    const { blockRangeMap, uncoveredBlockRanges } = cache;

    const len = ranges.length;
    for (let i = 1; i < len; i++) {
        const blockRange = ranges[i];

        const { count, startOffset } = blockRange;

        if (!blockRangeMap.has(startOffset)) {
            blockRangeMap.set(startOffset, blockRange);
        }

        if (count === 0) {
            uncoveredBlockRanges.push(blockRange);
        }
    }

};

const addFunctionRange = (functionRange, cache) => {
    const {
        functionRangeMap, functionNameMap, uncoveredFunctionRanges
    } = cache;

    const {
        startOffset, count, functionName
    } = functionRange;

    // keep range reference to map, will set back the wrap info

    // already exists and keep name offset
    if (functionRangeMap.has(startOffset)) {
        if (functionName) {
            const nameOffset = startOffset + functionName.length;
            functionNameMap.set(nameOffset, functionRange);
        }
    } else {
        // add normal offset
        functionRangeMap.set(startOffset, functionRange);
    }

    // uncovered
    if (count === 0) {
        uncoveredFunctionRanges.push(functionRange);
    }
};

// =======================================================================================

const isInUncoveredRanges = (fun, uncoveredRanges) => {

    // TODO high performance find
    const inRange = uncoveredRanges.find((range) => {
        return fun.start >= range.startOffset && fun.end <= range.endOffset;
    });
    if (inRange) {
        return true;
    }
    return false;
};

const handleFunctions = (functions, cache) => {

    const {
        functionRangeMap, functionNameMap, uncoveredFunctionRanges
    } = cache;

    functions.sort((a, b) => {
        return a.start - b.start;
    });

    // if (item.sourcePath.endsWith('test-v8-node.js')) {
    //     console.log('==========================================================', item.sourcePath);
    //     console.log('coverage ranges', functionRangeMap);
    //     console.log('ast functions', functions);
    // }

    functions.forEach((item) => {
        let range = functionRangeMap.get(item.start);
        if (!range) {
            range = functionNameMap.get(item.start);
        }

        // exact matched
        if (range) {
            item.count = range.count;

            // set wrap back to ranges
            if (item.wrap) {
                range.wrap = true;
            }

            return;
        }

        // not found the function, could be in or out a range
        // if function in uncovered function should be 0 too
        if (isInUncoveredRanges(item, uncoveredFunctionRanges)) {
            item.count = 0;
            return;
        }

        // otherwise could be 1 by default
        item.count = 1;

    });

    // console.log(functions);

};

// =======================================================================================

const getFunctionCount = (functionStart, cache) => {
    const { functionRangeMap, functionNameMap } = cache;
    let functionRange = functionRangeMap.get(functionStart);
    if (!functionRange) {
        functionRange = functionNameMap.get(functionStart);
    }

    if (functionRange) {
        // console.log('found', functionRange.count);
        return functionRange.count;
    }

    // console.log('not found', item.count);
    return 1;
};

const handleBranches = (branches, cache) => {

    const { blockRangeMap, uncoveredBlockRanges } = cache;
    // console.log(branches);

    // console.log(blockRangeMap);

    branches.forEach((branchInfo) => {

        // update branch end to last location end
        let end;
        branchInfo.locations.forEach((item, i) => {

            const { start, functionStart } = item;

            // no need count for none else branch
            if (typeof start !== 'number') {
                // TODO
                // const relatedItem = item.relatedStart;
                // console.log('related item', relatedItem);

                const prevItem = branchInfo.locations[i - 1];
                console.log('related item', item.relatedStart, prevItem.start, prevItem.count);

                if (prevItem.count > 0) {
                    item.count = 0;
                } else {
                    item.count = getFunctionCount(functionStart, cache);
                }

                return;
            }

            end = item.end;

            // find from coverage info
            const block = blockRangeMap.get(start);
            if (block) {
                item.count = block.count;
                // console.log(block);
                return;
            }

            if (isInUncoveredRanges(item, uncoveredBlockRanges)) {
                item.count = 0;
                return;
            }

            // using parent function count
            item.count = getFunctionCount(functionStart, cache);

        });

        // last location end
        branchInfo.loc.end = end;

    });

    // console.log(branches);
};

// =======================================================================================

const countCoverageInfo = (item, coverageList, functions, branches) => {

    const cache = {
        functionRangeMap: new Map(),
        functionNameMap: new Map(),
        uncoveredFunctionRanges: [],

        blockRangeMap: new Map(),
        uncoveredBlockRanges: []
    };


    coverageList.forEach((block) => {
        const { functionName, ranges } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        functionRange.functionName = functionName;
        addFunctionRange(functionRange, cache);

        // blocks
        addUncoveredBlockRanges(ranges, cache);

    });

    handleFunctions(functions, cache);
    handleBranches(branches, cache);

};

const addBranchNode = (type, branchStart, node, functionInfo, cache) => {

    const functionStart = functionInfo.start;
    const { branchMap, locationMap } = cache;

    const { start, end } = node;

    const location = {
        functionStart,
        branchStart,
        start,
        end,
        count: 1
    };
    locationMap.set(start, location);

    const prevBranchInfo = branchMap.get(branchStart);
    if (prevBranchInfo) {
        prevBranchInfo.locations.push(location);
    } else {
        const newBranchInfo = {
            type,
            loc: {
                start: branchStart,
                // could be updated if multiple locations
                end: location.end
            },
            locations: [location]
        };
        branchMap.set(branchStart, newBranchInfo);
    }

};

const addEmptyBranchNode = (branchStart, relatedNode, functionInfo, cache) => {

    const functionStart = functionInfo.start;
    const { branchMap } = cache;

    // not found else
    const prevBranchInfo = branchMap.get(branchStart);
    if (prevBranchInfo) {
        prevBranchInfo.locations.push({
            relatedStart: relatedNode.start,
            functionStart
        });
    }


};


const handleFunctionBranches = (fNode, functionInfo, cache) => {
    // console.log(childNode);

    Util.visitAst(fNode, {
        // branches

        Function() {
            return 'break';
        },

        // var b = a || b || c;
        LogicalExpression(node) {
            const { left, right } = node;
            let start = left.start;

            // link to same branch start if LogicalExpression
            const prevLocation = cache.locationMap.get(start);
            if (prevLocation) {
                // console.log('link branch ==================', type);
                start = prevLocation.branchStart;
            } else {
                addBranchNode('LogicalExpression', start, left, functionInfo, cache);
            }

            addBranchNode('LogicalExpression', start, right, functionInfo, cache);
        },

        // Ternary
        // var b = a ? 'consequent' : 'alternate';
        ConditionalExpression(node) {
            const { consequent, alternate } = node;
            const start = consequent.start;
            addBranchNode('ConditionalExpression', start, consequent, functionInfo, cache);
            addBranchNode('ConditionalExpression', start, alternate, functionInfo, cache);
        },

        IfStatement(node) {
            const { consequent, alternate } = node;
            const start = consequent.start;
            addBranchNode('IfStatement', start, consequent, functionInfo, cache);
            if (alternate) {
                addBranchNode('IfStatement', start, alternate, functionInfo, cache);
            } else {
                addEmptyBranchNode(start, consequent, functionInfo, cache);
            }
        }

        // SwitchStatement(node) {
        //     const cases = node.cases;
        //     cases.forEach((switchCase) => {
        //         branchesMap.set(switchCase.start, {
        //             start: switchCase.start,
        //             end: switchCase.end
        //         });
        //     });
        // },

        // const fun = (a = 0) => {
        // can NOT detect whether it is covered
        // AssignmentPattern(node) {
        // console.log(node);
        // },
    });

};

const initAstCoverage = (item, coverageList, ast, functions, branches) => {

    const cache = {
        branchMap: new Map(),
        locationMap: new Map()
    };

    Util.visitAst(ast, {

        VariableDeclarator(node, parents) {
            // id: { type: 'Identifier', name: '__webpack_modules__' },
            const name = node.id && node.id.name;
            if (name === '__webpack_modules__' && node.init) {
                // mark all as wrap function
                node.init.properties.forEach((it) => {
                    it.value.wrapKey = it.key && it.key.value;
                });
                // console.log('==========================', node.type);
                // console.log(name, parents.length);
            }
        },

        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node) {
            const functionName = node.id && node.id.name;

            let wrap = false;
            if (node.wrapKey) {
                wrap = true;
                // console.log('wrapKey', node.wrapKey);
            }

            const functionInfo = {
                start: node.start,
                end: node.end,
                functionName,
                wrap
            };

            functions.push(functionInfo);

            handleFunctionBranches(node.body, functionInfo, cache);

        }

    });

    cache.branchMap.forEach((it) => {
        branches.push(it);
    });

    branches.sort((a, b) => {
        return a.loc.start - b.loc.start;
    });

    countCoverageInfo(item, coverageList, functions, branches);

};

const getAstInfo = (item, coverageList) => {

    const { source, js } = item;

    const functions = [];
    const branches = [];

    // not for css
    if (js) {

        const options = {
            ecmaVersion: 'latest',
            allowReturnOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowSuperOutsideMethod: true,
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

        initAstCoverage(item, coverageList, ast, functions, branches);

    }

    return {
        functions,
        branches
    };
};


module.exports = {
    getAstInfo
};
