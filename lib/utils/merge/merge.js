/**
 * The `mergeV8Coverage` was extracted from following repos for fixing several issues
 * https://github.com/bcoe/v8-coverage
 * https://github.com/demurgos/v8-coverage
 */

const RangeTree = require('./range-tree.js');


/**
 * Compares two range coverages.
 *
 * The ranges are first ordered by ascending `startOffset` and then by
 * descending `endOffset`.
 * This corresponds to a pre-order tree traversal.
 */
function compareRangeCovs(a, b) {
    if (a.startOffset !== b.startOffset) {
        return a.startOffset - b.startOffset;
    }
    return b.endOffset - a.endOffset;
}

/**
 * Compares two function coverages.
 *
 * The result corresponds to the comparison of the root ranges.
 */
function compareFunctionCovs(a, b) {
    return compareRangeCovs(a.ranges[0], b.ranges[0]);
}

/**
 * @precodition `ranges` are well-formed and pre-order sorted
 */
function fromSortedRanges(ranges) {
    let root;
    // Stack of parent trees and parent counts.
    const stack = [];
    for (const range of ranges) {
        const node = new RangeTree(range.startOffset, range.endOffset, range.count, []);
        if (!root) {
            root = node;
            stack.push([node, range.count]);
            continue;
        }
        let parent;
        let parentCount;
        while (true) {
            [parent, parentCount] = stack[stack.length - 1];
            // assert: `top !== undefined` (the ranges are sorted)
            if (range.startOffset < parent.end) {
                break;
            } else {
                stack.pop();
            }

            // prevent crash when v8 incorrectly merges static_initializer's
            if (stack.length === 0) {
                break;
            }
        }
        node.delta -= parentCount;
        parent.children.push(node);
        stack.push([node, range.count]);
    }
    return root;
}

/**
 * Normalizes a function coverage.
 *
 * Sorts the ranges (pre-order sort).
 * TODO: Tree-based normalization of the ranges.
 *
 * @param funcCov Function coverage to normalize.
 */
function normalizeFunctionCov(funcCov) {
    funcCov.ranges.sort(compareRangeCovs);
    const tree = fromSortedRanges(funcCov.ranges);
    tree.normalize();
    funcCov.ranges = tree.toRanges();
}

/**
 * Normalizes a script coverage.
 *
 * Sorts the function by root range (pre-order sort).
 * This does not normalize the function coverages.
 *
 * @param scriptCov Script coverage to normalize.
 */
function normalizeScriptCov(scriptCov) {
    scriptCov.functions.sort(compareFunctionCovs);
}


/**
 * Normalizes a script coverage deeply.
 *
 * Normalizes the function coverages deeply, then normalizes the script coverage
 * itself.
 *
 * @param scriptCov Script coverage to normalize.
 */
function deepNormalizeScriptCov(scriptCov) {
    for (const funcCov of scriptCov.functions) {
        normalizeFunctionCov(funcCov);
    }
    normalizeScriptCov(scriptCov);
}


/**
 * Returns a string representation of the root range of the function.
 *
 * This string can be used to match function with same root range.
 * The string is derived from the start and end offsets of the root range of
 * the function.
 * This assumes that `ranges` is non-empty (true for valid function coverages).
 *
 * @param funcCov Function coverage with the range to stringify
 * @internal
 */
function stringifyFunctionRootRange(funcCov) {
    const rootRange = funcCov.ranges[0];
    return `${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`;
}


function insertChild(parentToNested, parentIndex, tree) {
    let nested = parentToNested.get(parentIndex);
    if (!nested) {
        nested = [];
        parentToNested.set(parentIndex, nested);
    }
    nested.push(tree);
}

function nextChild(openRange, parentToNested) {
    const matchingTrees = [];

    for (const nested of parentToNested.values()) {
        if (nested.length === 1 && nested[0].start === openRange.start && nested[0].end === openRange.end) {
            matchingTrees.push(nested[0]);
        } else {
            matchingTrees.push(new RangeTree(
                openRange.start,
                openRange.end,
                0,
                nested
            ));
        }
    }
    parentToNested.clear();
    return mergeRangeTrees(matchingTrees);
}

class StartEventQueue {

    constructor(queue) {
        this.queue = queue;
        this.nextIndex = 0;
        this.pendingOffset = 0;
        this.pendingTrees = null;
    }

    setPendingOffset(offset) {
        this.pendingOffset = offset;
    }

    pushPendingTree(tree) {
        if (this.pendingTrees === null) {
            this.pendingTrees = [];
        }
        this.pendingTrees.push(tree);
    }

    next() {
        const pendingTrees = this.pendingTrees;
        const nextEvent = this.queue[this.nextIndex];
        if (pendingTrees === null) {
            this.nextIndex++;
            return nextEvent;
        }
        if (!nextEvent) {
            this.pendingTrees = null;
            return {
                offset: this.pendingOffset,
                trees: pendingTrees
            };
        }
        if (this.pendingOffset < nextEvent.offset) {
            this.pendingTrees = null;
            return {
                offset: this.pendingOffset,
                trees: pendingTrees
            };
        }
        if (this.pendingOffset === nextEvent.offset) {
            this.pendingTrees = null;
            for (const tree of pendingTrees) {
                nextEvent.trees.push(tree);
            }
        }
        this.nextIndex++;
        return nextEvent;


    }
}

function fromParentTrees(parentTrees) {
    const startToTrees = new Map();
    for (const [parentIndex, parentTree] of parentTrees.entries()) {
        for (const child of parentTree.children) {
            let trees = startToTrees.get(child.start);
            if (!trees) {
                trees = [];
                startToTrees.set(child.start, trees);
            }
            trees.push({
                parentIndex,
                tree: child
            });
        }
    }
    const queue = [];
    for (const [startOffset, trees] of startToTrees) {
        queue.push({
            offset: startOffset,
            trees
        });
    }
    queue.sort((a, b) => {
        return a.offset - b.offset;
    });
    return new StartEventQueue(queue);
}

// eslint-disable-next-line complexity
function mergeRangeTreeChildren(parentTrees) {
    const result = [];
    const startEventQueue = fromParentTrees(parentTrees);
    const parentToNested = new Map();
    let openRange = null;

    while (true) {
        const event = startEventQueue.next();
        if (!event) {
            break;
        }

        if (openRange !== null && openRange.end <= event.offset) {
            result.push(nextChild(openRange, parentToNested));
            openRange = null;
        }

        if (openRange === null) {
            let openRangeEnd = event.offset + 1;
            for (const { parentIndex, tree } of event.trees) {
                openRangeEnd = Math.max(openRangeEnd, tree.end);
                insertChild(parentToNested, parentIndex, tree);
            }
            startEventQueue.setPendingOffset(openRangeEnd);
            openRange = {
                start: event.offset, end: openRangeEnd
            };
        } else {
            for (const { parentIndex, tree } of event.trees) {
                if (tree.end > openRange.end) {
                    const right = tree.split(openRange.end);
                    startEventQueue.pushPendingTree({
                        parentIndex,
                        tree: right
                    });
                }
                insertChild(parentToNested, parentIndex, tree);
            }
        }
    }
    if (openRange !== null) {
        result.push(nextChild(openRange, parentToNested));
    }

    return result;
}

/**
 * @precondition Same `start` and `end` for all the trees
 */
function mergeRangeTrees(trees) {
    if (trees.length <= 1) {
        return trees[0];
    }
    const first = trees[0];
    let delta = 0;
    for (const tree of trees) {
        delta += tree.delta;
    }
    const children = mergeRangeTreeChildren(trees);
    return new RangeTree(first.start, first.end, delta, children);
}

/**
 * Merges a list of matching function coverages.
 *
 * Functions are matching if their root ranges have the same span.
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param funcCovs Function coverages to merge.
 * @return Merged function coverage, or `undefined` if the input list was empty.
 */
function mergeFunctionCovs(funcCovs) {
    if (funcCovs.length === 0) {
        return;
    }

    if (funcCovs.length === 1) {
        const merged = funcCovs[0];
        normalizeFunctionCov(merged);
        return merged;
    }

    const first = funcCovs[0];
    const functionName = first.functionName;
    // assert: `first.ranges.length > 0`
    const startOffset = first.ranges[0].startOffset;
    const endOffset = first.ranges[0].endOffset;
    let count = 0;

    const trees = [];
    for (const funcCov of funcCovs) {
        // assert: `funcCov.ranges.length > 0`
        // assert: `funcCov.ranges` is sorted
        count += typeof funcCov.count === 'number' ? funcCov.count : funcCov.ranges[0].count;
        if (funcCov.isBlockCoverage) {
            trees.push(fromSortedRanges(funcCov.ranges));
        }
    }

    let isBlockCoverage;
    let ranges;
    if (trees.length > 0) {
        isBlockCoverage = true;
        const mergedTree = mergeRangeTrees(trees);
        mergedTree.normalize();
        ranges = mergedTree.toRanges();
    } else {
        isBlockCoverage = false;
        ranges = [{
            startOffset,
            endOffset,
            count
        }];
    }

    const merged = {
        functionName,
        ranges,
        isBlockCoverage
    };
    if (count !== ranges[0].count) {
        merged.count = count;
    }
    // assert: `merged` is normalized
    return merged;
}


/**
 * Merges a list of matching script coverages.
 *
 * Scripts are matching if they have the same `url`.
 * The result is normalized.
 * The input values may be mutated, it is not safe to use them after passing
 * them to this function.
 * The computation is synchronous.
 *
 * @param scriptCovs Process coverages to merge.
 * @return Merged script coverage, or `undefined` if the input list was empty.
 */

// eslint-disable-next-line complexity
function mergeV8Coverage(scriptCovs) {
    if (!Array.isArray(scriptCovs)) {
        return {
            functions: []
        };
    }

    if (scriptCovs.length === 0) {
        return {
            functions: []
        };
    }

    if (scriptCovs.length === 1) {
        const merged = scriptCovs[0];
        deepNormalizeScriptCov(merged);
        return merged;
    }


    const rangeToFuncs = new Map();
    for (const scriptCov of scriptCovs) {
        for (const funcCov of scriptCov.functions) {
            const rootRange = stringifyFunctionRootRange(funcCov);
            let funcCovs = rangeToFuncs.get(rootRange);
            if (!funcCovs) {
                funcCovs = [];
                rangeToFuncs.set(rootRange, funcCovs);
            }
            funcCovs.push(funcCov);
        }
    }

    const functions = [];
    for (const funcCovs of rangeToFuncs.values()) {
        // assert: `funcCovs.length > 0`
        const block = mergeFunctionCovs(funcCovs);
        if (block) {
            functions.push(block);
        }
    }

    const merged = {
        functions
    };
    normalizeScriptCov(merged);
    return merged;
}

module.exports = {
    mergeV8Coverage
};
