const Util = require('../utils/util.js');

const BranchTypes = {
    ConditionalExpression: 'ConditionalExpression',
    LogicalExpression: 'LogicalExpression',
    IfStatement: 'IfStatement',
    SwitchStatement: 'SwitchStatement',
    AssignmentPattern: 'AssignmentPattern'
};

const setGeneratedOnly = (block, generatedOnly) => {
    if (block && generatedOnly) {
        block.generatedOnly = true;
    }
};

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

const getFunctionRange = (start, end, type, coverageInfo) => {

    const {
        functionMap, functionNameMap, functionStaticRanges, functionUncoveredRanges
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

    if (type === 'StaticBlock' && functionStaticRanges.length) {
        const staticRange = Util.findInRanges(start, end, functionStaticRanges, 'startOffset', 'endOffset');
        if (staticRange) {
            return staticRange;
        }
    }

    // find in uncoveredRanges
    return Util.findInRanges(start, end, functionUncoveredRanges, 'startOffset', 'endOffset');
};

const getFunctionBlock = (start, end, functionState) => {
    if (!functionState) {
        return;
    }

    const { range } = functionState;
    if (!range) {
        return;
    }

    const {
        blockMap, blockUncoveredRanges, blockCoveredRanges
    } = range;

    if (!blockMap) {
        return;
    }

    const block = blockMap.get(start);
    if (block) {
        return block;
    }

    const uncoveredBlock = Util.findInRanges(start, end, blockUncoveredRanges, 'startOffset', 'endOffset');
    if (uncoveredBlock) {
        return uncoveredBlock;
    }

    // the block is not exact correct, if there is a block wrapped
    // [x8]{ var a = b || [x4]c }, b is no block, but it can be found in x8 block
    const coveredBlocks = blockCoveredRanges.filter((it) => start >= it.startOffset && end <= it.endOffset);
    if (coveredBlocks.length) {
        return coveredBlocks.pop();
    }

};

const addNodeCount = (item) => {

    const { node, reverseParents } = item;

    if (node._state) {
        return;
    }

    const { start, end } = node;
    const functionState = getParentFunctionState(reverseParents);
    const block = getFunctionBlock(start, end, functionState);
    if (block) {
        node._state = {
            count: block.count
        };
    }

};

// =======================================================================================

const createBranchGroup = (type, node, parents, branchMap) => {
    const { start, end } = node;
    // clone and reverse parents
    const reverseParents = [].concat(parents).reverse();
    const group = {
        type,

        start,
        // could be updated if multiple locations
        end,

        locations: [],
        reverseParents
    };

    if (type === BranchTypes.LogicalExpression) {
        // && or ||
        group.operator = node.operator;
    }

    // could be same start
    const branchKey = `${start}_${end}`;

    branchMap.set(branchKey, group);
    return group;
};

const addBranch = (group, node, locationMap) => {
    const {
        start, end, type
    } = node;

    const branchKey = `${group.start}_${group.end}`;

    const branchInfo = {
        // for get previous group for LogicalExpression
        branchKey,
        start,
        end,
        // branch count default to 0
        count: 0
    };

    if (type === 'SwitchCase') {

        // console.log(node);

        // check break
        if (node.consequent) {
            const breakItem = node.consequent.find((it) => it.type === 'BreakStatement');
            if (breakItem) {
                branchInfo.hasBreak = true;
            }
        }

        // check default
        if (!node.test) {
            branchInfo.isDefault = true;
        }
    }

    group.locations.push(branchInfo);

    // update group end
    if (end > group.end) {
        group.end = end;
    }

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
    locations.forEach((item, i) => {
        if (item.block) {
            item.count = item.block.count;
            blockCount += item.count;
            return;
        }
        // for calculate mo break branches
        item.index = i;
        noBlockList.push(item);
    });

    return {
        noBlockList,
        blockCount
    };
};

// const a = tf1 ? 'true' : 'false';
const ConditionalExpression = (group, parentCount) => {
    const { noBlockList, blockCount } = updateBlockLocations(group.locations);
    if (!noBlockList.length) {
        return;
    }
    let count = parentCount - blockCount;
    noBlockList.forEach((item) => {
        item.count = count;
        count = 0;
    });
};

const IfStatement = (group, parentCount) => {
    const { noBlockList, blockCount } = updateBlockLocations(group.locations);
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
const LogicalExpression = (group, parentCount) => {

    // from left to right
    group.locations.forEach((item, i) => {
        if (item.block) {
            item.count = item.block.count;
        } else {
            item.count = parentCount;
        }
    });

};

const SwitchStatement = (group, parentCount) => {

    const locations = group.locations;

    const { noBlockList, blockCount } = updateBlockLocations(locations);
    if (!noBlockList.length) {
        return;
    }

    // calculate switch/case count
    const countLeft = parentCount - blockCount;
    noBlockList.forEach((item) => {

        let hasCount = false;

        // check no break branches
        for (let i = item.index - 1; i >= 0; i--) {
            const b = locations[i];
            if (b && !b.hasBreak && b.count > 0) {
                item.count += b.count;
                hasCount = true;
                continue;
            }
            break;
        }

        if (!hasCount) {
            item.count = countLeft;
        }
    });
};

const AssignmentPattern = (group, parentCount) => {
    group.locations.forEach((item) => {
        item.count = parentCount;
    });
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

    // parent is block statement or function
    let parentCount = getParentCount(reverseParents, functionCount);
    // parent is group range
    const groupBlock = getFunctionBlock(group.start, group.end, functionState);
    if (groupBlock) {
        parentCount = groupBlock.count;
        setGeneratedOnly(groupBlock, group.generatedOnly);
    }

    // calculate branches count
    locations.forEach((item) => {
        const {
            start, end, none
        } = item;
        if (none) {
            return;
        }

        item.block = getFunctionBlock(start, end, functionState);
        setGeneratedOnly(item.block, group.generatedOnly);

    });


    const handlers = {
        ConditionalExpression,
        LogicalExpression,
        IfStatement,
        SwitchStatement,
        AssignmentPattern
    };

    const handler = handlers[type];
    if (handler) {
        handler(group, parentCount);
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

        const branch = {
            type: group.type,
            start: group.start,
            end: group.end,
            locations: group.locations
        };

        setGeneratedOnly(branch, group.generatedOnly);

        branches.push(branch);
    });

    // sort branches
    branches.sort((a, b) => {
        return a.start - b.start;
    });

    return branches;
};

// =======================================================================================
// All programs in JavaScript are made of statements and they end with semicolons (;) except block statements which is used to group zero or more statements.
// Statements are just perform some actions but do not produce any value or output whereas expressions return some value.
// Expressions return value, statements do not.
const generateStatements = (statementNodes) => {

    statementNodes.forEach((item) => {
        const {
            node,
            reverseParents
        } = item;

        const { start, end } = node;

        item.count = 1;

        // isFunction
        if (node._state) {
            item.count = node._state.count;
            return;
        }

        const functionState = getParentFunctionState(reverseParents);
        if (!functionState) {
            // there is a root range, it impossible not found
            return;
        }

        // function uncovered
        if (functionState.count === 0) {
            item.count = 0;
            return;
        }

        const block = getFunctionBlock(start, end, functionState);
        if (block) {
            item.count = block.count;
            return;
        }

        item.count = functionState.count;

    });

    // remove block statement
    statementNodes = statementNodes.filter((item) => {
        return item.node.type !== 'BlockStatement';
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
// handle special generated codes for original coverage

const webpackWrapHandler = (node) => {
    // ignore webpack wrap for original function
    // id: { type: 'Identifier', name: '__webpack_modules__' },
    const name = node.id && node.id.name;
    if (name === '__webpack_modules__' && node.init && node.init.properties) {
        // mark all as wrap function
        node.init.properties.forEach((it) => {
            it.value._webpackWrapKey = it.key && it.key.value;
        });
        // console.log('==========================', node.type);
        // console.log(name, parents.length);
    }
};

const viteImportDefaultHandler = (node, group) => {
    // ignore vite conditional expression for __esModule default
    const testObj = node.test.object;
    const testName = testObj && testObj.name;
    if (testName && testName.startsWith('__vite__cjsImport')) {
        setGeneratedOnly(group, true);
    }

};


// =======================================================================================

const collectNodes = (ast) => {
    const functionNodes = [];
    const statementNodes = [];
    const blockNodes = [];
    const branchMap = new Map();
    // locationMap for chain LogicalExpression locations
    const locationMap = new Map();

    Util.visitAst(ast, {

        VariableDeclarator(node, parents) {

            webpackWrapHandler(node);

        },

        // ===============================================================================
        // statements

        Statement: (node, parents) => {
            const reverseParents = [].concat(parents).reverse();
            statementNodes.push({
                node,
                reverseParents
            });
        },

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static
        // as a function "functionName": "<static_initializer>",
        StaticBlock: (node, parents) => {
            const reverseParents = [].concat(parents).reverse();
            functionNodes.push({
                node,
                reverseParents
            });
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
            const group = createBranchGroup(BranchTypes.AssignmentPattern, node, parents, branchMap);
            addBranch(group, node, locationMap);
        },

        // cond-expr a ternary expression. e.g.: x ? y : z
        // Ternary
        // var b = a ? 'consequent' : 'alternate';
        ConditionalExpression: (node, parents) => {

            const { consequent, alternate } = node;
            const group = createBranchGroup(BranchTypes.ConditionalExpression, node, parents, branchMap);
            addBranch(group, consequent, locationMap);
            addBranch(group, alternate, locationMap);

            viteImportDefaultHandler(node, group);

        },

        // if an if statement; can also be else if.
        // An IF statement always has exactly two branches:
        // one where the condition is FALSE and one where the condition is TRUE
        IfStatement: (node, parents) => {
            const { consequent, alternate } = node;
            const group = createBranchGroup(BranchTypes.IfStatement, node, parents, branchMap);
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
            // console.log(left.start, right.start);

            // could be same branch start
            // const da = arguments.length > 1 && typeof arguments[1] !== 'undefined' ? arguments[1] : true;

            let group;
            // link to same branch start if LogicalExpression
            const prevLocation = locationMap.get(node.start);
            if (prevLocation) {
                // console.log('link branch ==================', type);
                group = branchMap.get(prevLocation.branchKey);
            } else {
                group = createBranchGroup(BranchTypes.LogicalExpression, node, parents, branchMap);
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
                const lastEnd = locations[locations.length - 1].end;
                if (lastEnd > group.end) {
                    group.end = lastEnd;
                }
            }
        },

        // switch a switch statement.
        SwitchStatement: (node, parents) => {
            const group = createBranchGroup(BranchTypes.SwitchStatement, node, parents, branchMap);
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

// eslint-disable-next-line complexity
const findFunctionRange = (item, coverageInfo) => {

    const { node, reverseParents } = item;
    const {
        start, end, type
    } = node;

    // try function start/end
    const functionRange = getFunctionRange(start, end, type, coverageInfo);
    if (functionRange) {
        return functionRange;
    }

    // `static async` case:
    // [1]static [2]async [3]covered(active) {
    // v8 start: 2
    // ast start: 1,3

    // fixed by async or static

    // handle for static async
    if (node.async) {
        // 'async '.length
        const asyncLen = 6;
        const asyncStart = start - asyncLen;
        // console.log(asyncStart, 'asyncStart ===============================================');
        const asyncRange = getFunctionRange(asyncStart, end, type, coverageInfo);
        if (asyncRange) {
            return asyncRange;
        }
    }

    // try if class MethodDefinition
    // 0 is function self
    const parent = reverseParents[1];
    if (parent && parent.type === 'MethodDefinition') {

        const parentRange = getFunctionRange(parent.start, parent.end, parent.type, coverageInfo);
        if (parentRange) {
            return parentRange;
        }

        if (parent.static) {
            // 'static '.length
            const staticLen = 7;
            const staticStart = parent.start + staticLen;
            // console.log(staticStart, ' staticStart ============================================');
            const staticRange = getFunctionRange(staticStart, parent.end, parent.type, coverageInfo);
            if (staticRange) {
                return staticRange;
            }
        }

    }


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

        const bodyStart = node.body.start;
        const bodyEnd = node.body.end;
        const functionName = id && id.name;
        const _webpackWrapKey = node._webpackWrapKey;

        const functionItem = {
            start,
            end,
            bodyStart,
            bodyEnd,
            functionName,
            count: rootState.count
        };

        setGeneratedOnly(functionItem, _webpackWrapKey);

        functions.push(functionItem);

        const functionState = {
            isFunction: true,
            count: functionItem.count
        };

        const functionRange = findFunctionRange(item, coverageInfo);
        if (functionRange) {

            setGeneratedOnly(functionRange, _webpackWrapKey);

            functionState.range = functionRange;
            functionState.count = functionRange.count;
            functionItem.count = functionRange.count;
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
    BranchTypes,
    collectAstInfo
};
