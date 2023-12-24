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

const getBranchCount = (start, end, functionInfo) => {

    if (functionInfo.count === 0) {
        return 0;
    }

    const functionRange = functionInfo.range;
    if (!functionRange) {
        return 0;
    }

    const { blockMap, blockRanges } = functionRange;
    if (blockMap) {
    // exact matched a block
        const block = blockMap.get(start);
        if (block) {
            return block.count;
        }

        // support for tf2 || a || 1;
        // "a" is in "|| a"
        const blockRange = findInRanges(start, end, blockRanges);
        if (blockRange) {
            return blockRange.count;
        }
    }

    // TODO if nested, using parent block count
    return functionInfo.count;

};

const getNoneBranchCount = (ifLocation, functionInfo) => {

    if (functionInfo.count === 0) {
        return 0;
    }

    // check if any linked ifLocation is covered
    let covered = false;
    let current = ifLocation;
    while (current) {
        if (current.count > 0) {
            covered = true;
            break;
        }
        current = current.ifLocation;
    }

    // TODO if nested
    if (covered) {
        return 0;
    }
    return functionInfo.count;

};

// =======================================================================================

const createBranchGroup = (type, branchStart, branchMap) => {
    const group = {
        type,
        loc: {
            start: branchStart,
            // could be updated if multiple locations
            end: branchStart
        },
        locations: []
    };
    branchMap.set(branchStart, group);
    return group;
};

const addBranch = (group, node, functionInfo) => {
    const functionStart = functionInfo.start;
    const { start, end } = node;

    const { locationMap } = functionInfo;

    const branchStart = group.loc.start;

    const count = getBranchCount(start, end, functionInfo);

    const branchInfo = {
        functionStart,
        branchStart,
        start,
        end,
        count
    };

    group.locations.push(branchInfo);

    // update group end
    group.loc.end = end;

    locationMap.set(start, branchInfo);

    return branchInfo;
};

const addNoneBranch = (group, ifLocation, functionInfo) => {

    const count = getNoneBranchCount(ifLocation, functionInfo);

    const emptyElseLocation = {
        functionStart: functionInfo.start,
        count
    };

    group.locations.push(emptyElseLocation);
    // no need update group end, there is no end
};

// only for LogicalExpression
const sortBranchGroupLocations = (group) => {

    const { loc, locations } = group;

    // sort branch locations
    // a || b || c
    // first, left a and right c
    // then, left a and right b
    locations.sort((a, b) => {
        return a.start - b.start;
    });

    // update group end after sorted
    loc.end = locations[locations.length - 1].end;

};

// =======================================================================================
// 1, binary-expr
// var b = a || b || c;
const LogicalExpression = (node, functionInfo, branchMap) => {
    const { left, right } = node;
    const start = left.start;

    // console.log(left.start, right.start);

    const { locationMap } = functionInfo;

    let group;
    // link to same branch start if LogicalExpression
    const prevLocation = locationMap.get(start);
    if (prevLocation) {
        // console.log('link branch ==================', type);
        group = branchMap.get(prevLocation.branchStart);
    } else {
        group = createBranchGroup('LogicalExpression', start, branchMap);
        addBranch(group, left, functionInfo);
    }

    addBranch(group, right, functionInfo);

    // console.log(group.locations.map((it) => it.start));
    // sort branch locations
    sortBranchGroupLocations(group);

};

// =======================================================================================
// 2, cond-expr Ternary
// var b = a ? 'consequent' : 'alternate';
const ConditionalExpression = (node, functionInfo, branchMap) => {
    const { consequent, alternate } = node;
    const start = consequent.start;
    const group = createBranchGroup('ConditionalExpression', start, branchMap);
    addBranch(group, consequent, functionInfo);
    addBranch(group, alternate, functionInfo);
};

// =======================================================================================
// 3, if
// An IF statement always has exactly two branches:
// one where the condition is FALSE and one where the condition is TRUE
const IfStatement = (node, functionInfo, branchMap) => {
    const { consequent, alternate } = node;
    const start = consequent.start;
    const group = createBranchGroup('IfStatement', start, branchMap);
    const ifLocation = addBranch(group, consequent, functionInfo);

    // link ifLocation
    if (consequent.ifLocation) {
        ifLocation.ifLocation = consequent.ifLocation;
    }

    // console.log('if type', consequent.type);

    if (alternate) {
        addBranch(group, alternate, functionInfo);

        // else if branch link to if branch, could link multiple branches
        if (alternate.type === 'IfStatement') {
            // link ifLocation to chain
            alternate.consequent.ifLocation = ifLocation;
        }

    } else {

        addNoneBranch(group, ifLocation, functionInfo);

    }
};

// =======================================================================================

// 4, switch
const SwitchStatement = (node, functionInfo, branchMap) => {
    const start = node.start;
    const group = createBranchGroup('SwitchStatement', start, branchMap);
    const cases = node.cases;
    cases.forEach((switchCase) => {
        // console.log('switchCase', switchCase.start);
        addBranch(group, switchCase, functionInfo);
    });
};

// =======================================================================================

const collectBranches = (ast, functionInfo, branchMap) => {

    // locationMap for chain
    functionInfo.locationMap = new Map();

    Util.visitAst(ast, {

        Function() {
            return 'break';
        },

        LogicalExpression: (node) => {
            LogicalExpression(node, functionInfo, branchMap);
        },
        ConditionalExpression: (node) => {
            ConditionalExpression(node, functionInfo, branchMap);
        },
        IfStatement: (node) => {
            IfStatement(node, functionInfo, branchMap);
        },
        SwitchStatement: (node) => {
            SwitchStatement(node, functionInfo, branchMap);
        }

        // 5, default-arg - seems that V8 coverage do NOT supported
        // (a = 0) => {}
        // AssignmentPattern: (node) => {}

    });

};

module.exports = {
    findInRanges,
    collectBranches
};
