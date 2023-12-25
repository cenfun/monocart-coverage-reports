const Util = require('../utils/util.js');

const quickFindRange = (position, ranges) => {
    let start = 0;
    let end = ranges.length - 1;
    while (end - start > 1) {
        const i = Math.floor((start + end) * 0.5);
        const item = ranges[i];
        if (position < item.startOffset) {
            end = i;
            continue;
        }
        if (position > item.endOffset) {
            start = i;
            continue;
        }
        return ranges[i];
    }
    // last two items, less is start
    const endItem = ranges[end];
    if (position < endItem.start) {
        return ranges[start];
    }
    return ranges[end];
};


const findInRanges = (start, end, ranges) => {
    const range = quickFindRange(start, ranges);
    if (start >= range.startOffset && end <= range.endOffset) {
        return range;
    }
};

// =======================================================================================

const createBranchGroup = (type, branchStart, parents, branchMap, functionInfo) => {
    // clone and reverse parents
    const reverseParents = [].concat(parents).reverse();
    const group = {
        type,
        loc: {
            start: branchStart,
            // could be updated if multiple locations
            end: branchStart
        },
        locations: [],
        reverseParents,
        functionInfo
    };
    branchMap.set(branchStart, group);
    return group;
};

const addBranch = (group, node, locationMap) => {
    const { start, end } = node;

    const branchStart = group.loc.start;

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
    group.loc.end = end;

    locationMap.set(start, branchInfo);
};

// =======================================================================================

const addNodeCount = (node, parents, functionInfo) => {

    const { start, end } = node;
    const { count, range } = functionInfo;

    if (range) {
        const { blockMap, blockRanges } = range;
        if (blockMap) {
            const block = blockMap.get(start);
            if (block) {
                node._state = {
                    count: block.count
                };
                return;
            }

            const blockItem = findInRanges(start, end, blockRanges);
            if (blockItem) {
                node._state = {
                    count: blockItem.count
                };
                return;
            }

        }
    }

    const reverseParents = [].concat(parents).reverse();
    for (const parent of reverseParents) {
        if (parent._state) {
            node._state = {
                count: parent._state.count
            };
            return;
        }
    }

    // function count
    node._state = {
        count: count
    };

};

// =======================================================================================

const createBranches = (ast, functionInfo, branchMap) => {

    // locationMap for chain LogicalExpression locations
    const locationMap = new Map();

    Util.visitAst(ast, {

        Function() {
            return 'break';
        },

        Statement: (node, parents) => {
            addNodeCount(node, parents, functionInfo);
        },


        // 1, binary-expr
        // var b = a || b || c;
        // do not using BinaryExpression
        LogicalExpression: (node, parents) => {
            addNodeCount(node, parents, functionInfo);

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
                addBranch(group, left, locationMap);
            }

            addBranch(group, right, locationMap);

            // console.log(group.locations.map((it) => it.start));

            // sort branch locations
            // a || b || c
            // first, left a and right c
            // then, left a and right b
            if (prevLocation) {
                const { loc, locations } = group;
                locations.sort((a, b) => {
                    return a.start - b.start;
                });
                // update group end after sorted
                loc.end = locations[locations.length - 1].end;
            }
        },

        // 2, cond-expr Ternary
        // var b = a ? 'consequent' : 'alternate';
        ConditionalExpression: (node, parents) => {
            addNodeCount(node, parents, functionInfo);
            const { consequent, alternate } = node;
            const start = consequent.start;
            const group = createBranchGroup('ConditionalExpression', start, parents, branchMap, functionInfo);
            addBranch(group, consequent, locationMap);
            addBranch(group, alternate, locationMap);
        },

        // 3, if
        // An IF statement always has exactly two branches:
        // one where the condition is FALSE and one where the condition is TRUE
        IfStatement: (node, parents) => {
            addNodeCount(node, parents, functionInfo);
            const { consequent, alternate } = node;
            const start = consequent.start;
            const group = createBranchGroup('IfStatement', start, parents, branchMap, functionInfo);
            addBranch(group, consequent, locationMap);

            // console.log('if type', consequent.type);

            if (alternate) {
                addBranch(group, alternate, locationMap);
            } else {
                // add none branch
                group.locations.push({
                    none: true,
                    count: 0
                });
                // no need update group end, there is no end
            }
        },

        // 4, switch
        SwitchStatement: (node, parents) => {
            addNodeCount(node, parents, functionInfo);
            const start = node.start;
            const group = createBranchGroup('SwitchStatement', start, parents, branchMap, functionInfo);
            const cases = node.cases;
            cases.forEach((switchCase) => {
                // console.log('switchCase', switchCase.start);
                addBranch(group, switchCase, locationMap);
            });
        }

        // 5, default-arg - seems that V8 coverage do NOT supported
        // (a = 0) => {}
        // AssignmentPattern: (node) => {}

    });

};

// =======================================================================================

const getBranchCount = (start, end, reverseParents, functionInfo) => {

    const { range, count } = functionInfo;
    if (range) {
        const { blockMap, blockRanges } = range;
        if (blockMap) {
            // exact matched a block
            const block = blockMap.get(start);
            if (block) {
                return block.count;
            }

            // support for tf2 || a || 1;
            // "a" is in "|| a"
            const blockItem = findInRanges(start, end, blockRanges);
            if (blockItem) {
                return blockItem.count;
            }
        }
    }


};

const getBranchParentCount = (reverseParents, functionCount) => {
    // parent count
    for (const parent of reverseParents) {
        if (parent._state) {
            return parent._state.count;
        }
    }

    // root function count
    return functionCount;
};

const updateBranchCount = (group) => {

    const {
        locations, reverseParents, functionInfo
    } = group;

    const functionCount = functionInfo.count;

    // default to 0, no need continue
    if (functionCount === 0) {
        return;
    }

    const parentCount = getBranchParentCount(reverseParents, functionCount);
    console.log(functionInfo.start, 'function count', functionCount, 'parent count', parentCount);

    locations.forEach((item) => {
        if (item.none) {
            return;
        }
        const { start, end } = item;
        item.count = getBranchCount(start, end, reverseParents, functionInfo);
    });


};

const collectBranches = (branchMap) => {

    // calculate count for all branches
    branchMap.forEach((group) => {
        updateBranchCount(group);
    });

    // init branches
    const branches = [];
    branchMap.forEach((group) => {
        branches.push({
            type: group.type,
            loc: group.loc,
            locations: group.locations
        });
    });

    // sort branches
    branches.sort((a, b) => {
        return a.loc.start - b.loc.start;
    });

    return branches;
};

module.exports = {
    findInRanges,
    createBranches,
    collectBranches
};
