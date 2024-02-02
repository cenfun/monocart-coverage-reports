const Util = require('../utils/util.js');

const getParentFunctionState = (reverseParents) => {
    const parentFunction = reverseParents.find((it) => it._state && it._state.isFunction);
    if (!parentFunction) {
        return;
    }
    return parentFunction._state;
};

const getParentCount = (reverseParents, functionCount) => {
    // parent count
    const parent = reverseParents.find((it) => it._state);
    if (parent) {
        return parent._state.count;
    }
    // root function count
    return functionCount;
};

const hasFunctionBlock = (functionState) => {
    const { range } = functionState;
    if (range) {
        const { blockMap } = range;
        if (blockMap) {
            return true;
        }
    }
    return false;
};

const getFunctionRange = (start, end, coverageInfo) => {

    const {
        functionMap, functionNameMap, functionUncoveredRanges
    } = coverageInfo;

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

const addNodeCount = (item) => {

    const { node, reverseParents } = item;

    if (node._state) {
        return;
    }

    const functionState = getParentFunctionState(reverseParents);
    if (!hasFunctionBlock(functionState)) {
        return;
    }

    const { start, end } = node;
    const { range } = functionState;
    const { blockMap, blockUncoveredRanges } = range;

    const block = blockMap.get(start);
    if (block) {
        node._state = {
            count: block.count
        };
        return;
    }

    const uncoveredItem = Util.findInRanges(start, end, blockUncoveredRanges, 'startOffset', 'endOffset');
    if (uncoveredItem) {
        node._state = {
            count: uncoveredItem.count
        };
    }

};

// =======================================================================================

const createBranchGroup = (type, branchStart, parents, branchMap) => {
    // clone and reverse parents
    const reverseParents = [].concat(parents).reverse();
    const group = {
        type,

        start: branchStart,
        // could be updated if multiple locations
        end: branchStart,

        locations: [],
        reverseParents
    };
    branchMap.set(branchStart, group);
    return group;
};

const addBranch = (group, node, locationMap) => {
    const { start, end } = node;

    const branchStart = group.start;

    const branchInfo = {
        // for get previous group for LogicalExpression
        branchStart,
        start,
        end,
        // branch count default to 0
        count: 0
    };

    group.locations.push(branchInfo);

    // update group end
    group.end = end;

    locationMap.set(start, branchInfo);

    return branchInfo;
};

const addNoneBranch = (group) => {
    group.locations.push({
        none: true,
        count: 0
    });
};

// =======================================================================================

const updateBlockLocations = (locations) => {
    const noBlockList = [];
    let blockCount = 0;
    locations.forEach((item) => {
        if (item.block) {
            item.count = item.block.count;
            blockCount += item.count;
            return;
        }
        noBlockList.push(item);
    });

    return {
        noBlockList,
        blockCount
    };
};

// const a = tf1 ? 'true' : 'false';
const ConditionalExpression = (locations, parentCount) => {
    const { noBlockList, blockCount } = updateBlockLocations(locations);
    if (!noBlockList.length) {
        return;
    }
    let count = parentCount - blockCount;
    noBlockList.forEach((item) => {
        item.count = count;
        count = 0;
    });
};

const IfStatement = (locations, parentCount) => {
    const { noBlockList, blockCount } = updateBlockLocations(locations);
    if (!noBlockList.length) {
        return;
    }
    // console.log(parentCount, 'uncovered list', noBlockList.length, group.start);
    let count = parentCount - blockCount;
    noBlockList.forEach((item) => {
        item.count = count;
        count = 0;
    });

};

// const b = tf2 || tf1 || a;
const LogicalExpression = (locations, parentCount) => {
    const { noBlockList, blockCount } = updateBlockLocations(locations);
    if (!noBlockList.length) {
        return;
    }
    const count = parentCount - blockCount;
    noBlockList.forEach((item) => {
        item.count = count;
    });
};

const SwitchStatement = (locations, parentCount) => {
    const { noBlockList, blockCount } = updateBlockLocations(locations);
    if (!noBlockList.length) {
        return;
    }
    const count = parentCount - blockCount;
    noBlockList.forEach((item) => {
        item.count = count;
    });
};

const AssignmentPattern = (locations, parentCount) => {
    locations.forEach((item) => {
        item.count = parentCount;
    });
};

const getBranchBlock = (start, end, functionState) => {

    if (!hasFunctionBlock(functionState)) {
        return;
    }

    const { range } = functionState;
    const { blockMap, blockUncoveredRanges } = range;

    // exact matched a block
    const block = blockMap.get(start);
    if (block) {
        return block;
    }

    // support for tf2 || a || 1;
    // "a" is in "|| a"

    // uncovered is unique, first
    const uncoveredItem = Util.findInRanges(start, end, blockUncoveredRanges, 'startOffset', 'endOffset');
    if (uncoveredItem) {
        return uncoveredItem;
    }

};

// =======================================================================================

const updateBranchCount = (group) => {

    const {
        type, locations, reverseParents
    } = group;

    const functionState = getParentFunctionState(reverseParents);

    const functionCount = functionState.count;

    // default is 0, no need continue
    if (functionCount === 0) {
        return;
    }

    const parentCount = getParentCount(reverseParents, functionCount);
    // console.log(functionInfo.start, 'function count', functionCount, 'parent count', parentCount);

    if (!hasFunctionBlock(functionState)) {
        // default to parent if no function range
        locations.forEach((item) => {
            item.count = parentCount;
        });
        return;
    }

    // calculate branches count
    // > 1
    locations.forEach((item) => {
        const {
            start, end, none
        } = item;
        if (none) {
            return;
        }
        item.block = getBranchBlock(start, end, functionState);
    });

    const handlers = {
        ConditionalExpression,
        IfStatement,
        LogicalExpression,
        SwitchStatement,
        AssignmentPattern
    };

    const handler = handlers[type];
    if (handler) {
        handler(locations, parentCount);
    }

};

const generateBranches = (branchMap) => {

    // calculate count for all branches
    branchMap.forEach((group) => {
        updateBranchCount(group);
    });

    // init branches
    const branches = [];
    branchMap.forEach((group) => {

        // add start/end for none with group start/end
        group.locations.forEach((item) => {
            if (item.none) {
                item.start = group.start;
                item.end = group.end;
            }
        });

        branches.push({
            type: group.type,
            start: group.start,
            end: group.end,
            locations: group.locations
        });
    });

    // sort branches
    branches.sort((a, b) => {
        return a.start - b.start;
    });

    return branches;
};

// =======================================================================================

const getStatementBlock = (start, end, functionState) => {

    if (!hasFunctionBlock(functionState)) {
        return;
    }

    const { range } = functionState;
    const { blockMap, blockUncoveredRanges } = range;

    // exact matched a block
    const block = blockMap.get(start);
    if (block) {
        return block;
    }

    // support for tf2 || a || 1;
    // "a" is in "|| a"

    // uncovered is unique, first
    const uncoveredItem = Util.findInRanges(start, end, blockUncoveredRanges, 'startOffset', 'endOffset');
    if (uncoveredItem) {
        return uncoveredItem;
    }

};

// All programs in JavaScript are made of statements and they end with semicolons (;) except block statements which is used to group zero or more statements.
// Statements are just perform some actions but do not produce any value or output whereas expressions return some value.
// Expressions return value, statements do not.
const generateStatements = (statementNodes) => {

    statementNodes.forEach((item) => {
        const {
            node,
            reverseParents
        } = item;

        const {
            start, end, type
        } = node;

        item.count = 1;

        const functionState = getParentFunctionState(reverseParents);
        if (functionState) {
            const block = getStatementBlock(start, end, functionState);
            if (block) {
                item.count = block.count;
                item.block = block;

                // pass count from block statement
                if (type === 'BlockStatement') {
                    const p = reverseParents[0];
                    if (p) {
                        p._blockInfo = {
                            count: block.count
                        };
                    }
                }

            }
        }

    });

    // remove block statement
    statementNodes = statementNodes.filter((it) => it.node.type !== 'BlockStatement');

    statementNodes.forEach((item) => {
        if (item.block) {
            return;
        }
        const { node } = item;

        if (!node._blockInfo) {
            return;
        }

        item.count = node._blockInfo.count;

    });

    const statements = statementNodes.map((item) => {
        const {
            node,
            count
        } = item;
        const { start, end } = node;
        return {
            start,
            end,
            count
        };
    });

    return statements;
};

// =======================================================================================

const collectNodes = (ast) => {
    const functionNodes = [];
    const statementNodes = [];
    const blockNodes = [];
    const branchMap = new Map();
    // locationMap for chain LogicalExpression locations
    const locationMap = new Map();

    const addStatement = (node, parents) => {
        const reverseParents = [].concat(parents).reverse();
        statementNodes.push({
            node,
            reverseParents
        });
    };


    Util.visitAst(ast, {

        // ===============================================================================
        // statements
        ExpressionStatement: addStatement,
        BreakStatement: addStatement,
        ContinueStatement: addStatement,
        DebuggerStatement: addStatement,
        ReturnStatement: addStatement,
        ThrowStatement: addStatement,
        TryStatement: addStatement,
        // IfStatement: addStatement,
        ForStatement: addStatement,
        ForInStatement: addStatement,
        ForOfStatement: addStatement,
        WhileStatement: addStatement,
        DoWhileStatement: addStatement,
        // SwitchStatement: addStatement,
        WithStatement: addStatement,
        LabeledStatement: addStatement,

        VariableDeclarator(node, parents) {

            // =============================================================
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
            // =============================================================

            // statements
            if (node.init) {
                addStatement(node.init, parents);
            }
        },

        PropertyDefinition: (node, parents) => {
            if (node.static || node.key.type === 'PrivateIdentifier') {
                if (node.value) {
                    addStatement(node.value, parents);
                }
            }
        },

        // ===============================================================================
        // functions
        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node, parents) {
            const reverseParents = [].concat(parents).reverse();
            functionNodes.push({
                node,
                reverseParents
            });
        },

        // ===============================================================================
        // branches

        // `for` block, the count not equal to parent
        BlockStatement: (node, parents) => {

            // fix branch count: BRDA
            const reverseParents = [].concat(parents).reverse();
            blockNodes.push({
                node,
                reverseParents
            });

        },

        // default-arg assignment logic.
        // function default arguments
        AssignmentPattern: (node, parents) => {
            const start = node.start;
            const group = createBranchGroup('AssignmentPattern', start, parents, branchMap);
            addBranch(group, node, locationMap);
        },

        // cond-expr a ternary expression. e.g.: x ? y : z
        // Ternary
        // var b = a ? 'consequent' : 'alternate';
        ConditionalExpression: (node, parents) => {
            const { consequent, alternate } = node;
            const start = consequent.start;
            const group = createBranchGroup('ConditionalExpression', start, parents, branchMap);
            addBranch(group, consequent, locationMap);
            addBranch(group, alternate, locationMap);
        },

        // if an if statement; can also be else if.
        // An IF statement always has exactly two branches:
        // one where the condition is FALSE and one where the condition is TRUE
        IfStatement: (node, parents) => {
            addStatement(node, parents);

            const { consequent, alternate } = node;
            const start = consequent.start;
            const group = createBranchGroup('IfStatement', start, parents, branchMap);
            addBranch(group, consequent, locationMap);

            // console.log('if type', consequent.type);

            if (alternate) {
                addBranch(group, alternate, locationMap);
            } else {
                // add none branch
                addNoneBranch(group);
                // no need update group end, there is no end
            }
        },

        // binary-expr a logical expression with a binary operand. e.g.: x && y
        // var b = a || b || c;
        // do not use BinaryExpression
        LogicalExpression: (node, parents) => {
            const { left, right } = node;
            const start = left.start;

            // console.log(left.start, right.start);

            let group;
            // link to same branch start if LogicalExpression
            const prevLocation = locationMap.get(start);
            if (prevLocation) {
                // console.log('link branch ==================', type);
                group = branchMap.get(prevLocation.branchStart);
            } else {
                group = createBranchGroup('LogicalExpression', start, parents, branchMap);
                addBranch(group, left, locationMap);
            }

            addBranch(group, right, locationMap);

            // console.log(group.locations.map((it) => it.start));

            // sort branch locations
            // a || b || c
            // first, left a and right c
            // then, left a and right b
            if (prevLocation) {
                const { locations } = group;
                locations.sort((a, b) => {
                    return a.start - b.start;
                });
                // update group end after sorted
                group.end = locations[locations.length - 1].end;
            }
        },

        // switch a switch statement.
        SwitchStatement: (node, parents) => {
            addStatement(node, parents);

            const start = node.start;
            const group = createBranchGroup('SwitchStatement', start, parents, branchMap);
            const cases = node.cases;
            cases.forEach((switchCase) => {
                // console.log('switchCase', switchCase.start);
                addBranch(group, switchCase, locationMap);
            });
        }

    });

    return {
        functionNodes,
        statementNodes,
        blockNodes,
        branchMap
    };
};

const getRootFunctionState = (ast, coverageInfo) => {
    const rootState = {
        isFunction: true,
        count: 1
    };
    const rootRange = coverageInfo.rootRange;
    if (rootRange) {
        rootState.range = rootRange;
        rootState.count = rootRange.count;

        // could be not from 0
        // 0 881 { startOffset: 77, endOffset: 881,
        // const { start, end } = ast;
        // console.log(start, end, rootRange);

    }
    ast._state = rootState;

    return rootState;
};

const collectAstInfo = (ast, coverageInfo) => {

    const {
        functionNodes, statementNodes, blockNodes, branchMap
    } = collectNodes(ast);

    // root function state
    const rootState = getRootFunctionState(ast, coverageInfo);

    const functions = [];
    functionNodes.forEach((item) => {
        const { node } = item;
        const {
            start, end, id
        } = node;
        const functionName = id && id.name;
        const isWrap = Boolean(node._wrapKey);

        const functionItem = {
            start,
            end,
            functionName,
            count: rootState.count
        };
        if (isWrap) {
            functionItem.wrap = true;
        }
        functions.push(functionItem);

        const functionState = {
            isFunction: true
        };
        const functionRange = getFunctionRange(start, end, coverageInfo);
        if (functionRange) {
            if (isWrap) {
                functionRange.wrap = true;
            }
            functionState.range = functionRange;
            functionState.count = functionRange.count;
        }
        node._state = functionState;

        // console.log(item.reverseParents.map((it) => it.type));

    });

    blockNodes.forEach((item) => {
        addNodeCount(item);
    });

    const branches = generateBranches(branchMap);
    const statements = generateStatements(statementNodes);

    return {
        functions,
        branches,
        statements
    };

};

module.exports = {
    collectAstInfo
};
