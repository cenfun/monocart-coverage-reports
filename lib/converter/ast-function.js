const Util = require('../utils/util.js');

const findBranchBlock = (start, end, functionInfo) => {
    const { range } = functionInfo;
    if (!range) {
        return;
    }
    const {
        blockMap, blockUncoveredRanges, blockRanges
    } = range;

    if (!blockMap) {
        return;
    }

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

    //
    return Util.findInRanges(start, end, blockRanges, 'startOffset', 'endOffset');
};

// =======================================================================================

const createBranchGroup = (type, branchStart, parents, branchMap, functionInfo) => {
    // clone and reverse parents
    const reverseParents = [].concat(parents).reverse();
    const group = {
        type,

        start: branchStart,
        // could be updated if multiple locations
        end: branchStart,

        locations: [],
        reverseParents,
        functionInfo
    };
    branchMap.set(branchStart, group);
    return group;
};

const addBranch = (group, node, locationMap, functionInfo) => {
    const { start, end } = node;

    const branchStart = group.start;

    // the block is not exact correct, if there is a block wrapped
    // [x8]{ var a = b || [x4]c }, b is no block, but it can be found in x8 block
    const block = findBranchBlock(start, end, functionInfo);

    const branchInfo = {
        // for get previous group for LogicalExpression
        branchStart,
        start,
        end,
        // cache block
        block,
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

const visitFunctionParams = (functionInfo, outputInfo, params) => {
    // function's arguments

    if (!Util.isList(params)) {
        return;
    }

    const { branchMap, locationMap } = outputInfo;

    params.forEach((param) => {
        if (param.type !== 'AssignmentPattern') {
            return;
        }
        const start = param.start;
        const parents = [];
        const group = createBranchGroup('AssignmentPattern', start, parents, branchMap, functionInfo);
        addBranch(group, param, locationMap, functionInfo);
    });

};

const visitFunctionBody = (functionInfo, outputInfo, body) => {

    const { branchMap, locationMap } = outputInfo;

    Util.visitAst(body, {

        Function() {
            return 'break';
        },

        // cond-expr Ternary
        // var b = a ? 'consequent' : 'alternate';
        ConditionalExpression: (node, parents) => {
            const { consequent, alternate } = node;
            const start = consequent.start;
            const group = createBranchGroup('ConditionalExpression', start, parents, branchMap, functionInfo);
            addBranch(group, consequent, locationMap, functionInfo);
            addBranch(group, alternate, locationMap, functionInfo);
        },

        // if
        // An IF statement always has exactly two branches:
        // one where the condition is FALSE and one where the condition is TRUE
        IfStatement: (node, parents) => {
            const { consequent, alternate } = node;
            const start = consequent.start;
            const group = createBranchGroup('IfStatement', start, parents, branchMap, functionInfo);
            addBranch(group, consequent, locationMap, functionInfo);

            // console.log('if type', consequent.type);

            if (alternate) {
                addBranch(group, alternate, locationMap, functionInfo);
            } else {
                // add none branch
                addNoneBranch(group);
                // no need update group end, there is no end
            }
        },

        // binary-expr
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
                group = createBranchGroup('LogicalExpression', start, parents, branchMap, functionInfo);
                addBranch(group, left, locationMap, functionInfo);
            }

            addBranch(group, right, locationMap, functionInfo);

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

        // switch
        SwitchStatement: (node, parents) => {
            const start = node.start;
            const group = createBranchGroup('SwitchStatement', start, parents, branchMap, functionInfo);
            const cases = node.cases;
            cases.forEach((switchCase) => {
                // console.log('switchCase', switchCase.start);
                addBranch(group, switchCase, locationMap, functionInfo);
            });
        }

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

// =======================================================================================

const getParentCount = (reverseParents, functionCount) => {
    // parent count
    const parent = reverseParents.find((it) => it._state);
    if (parent) {
        return parent._state.count;
    }
    // root function count
    return functionCount;
};

const hasFunctionBlock = (functionInfo) => {
    const { range } = functionInfo;
    if (range) {
        const { blockMap } = range;
        if (blockMap) {
            return true;
        }
    }
    return false;
};

const updateBranchCount = (group) => {

    const {
        type, locations, reverseParents, functionInfo
    } = group;

    const functionCount = functionInfo.count;

    // default is 0, no need continue
    if (functionCount === 0) {
        return;
    }

    const parentCount = getParentCount(reverseParents, functionCount);
    // console.log(functionInfo.start, 'function count', functionCount, 'parent count', parentCount);

    if (!hasFunctionBlock(functionInfo)) {
        // default to parent if no function range
        locations.forEach((item) => {
            item.count = parentCount;
        });
        return;
    }

    // calculate branches count
    // > 1

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

module.exports = {
    visitFunctionBody,
    visitFunctionParams,
    generateBranches
};
