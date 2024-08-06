const acorn = require('acorn');
const acornLoose = require('acorn-loose');
const { parseCss } = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const { collectAstInfo } = require('./ast-visitor.js');

const getCoverageInfo = (coverageList) => {
    const functionMap = new Map();
    const functionNameMap = new Map();
    const functionStaticRanges = [];
    const functionUncoveredRanges = [];

    let rootRange;
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
            const blockMap = new Map();
            blockRanges.forEach((item) => {
                blockMap.set(item.startOffset, item);
            });
            functionRange.blockMap = blockMap;
            // uncovered is unique
            const blockUncoveredRanges = blockRanges.filter((it) => it.count === 0);
            Util.sortOffsetRanges(blockUncoveredRanges);
            functionRange.blockUncoveredRanges = blockUncoveredRanges;
            functionRange.blockCoveredRanges = blockRanges.filter((it) => it.count > 0);
        }

        // root function from vm
        if (root) {
            rootRange = functionRange;
            return;
        }

        // root function from first range
        if (!rootRange) {
            rootRange = functionRange;
        }

        functionMap.set(functionRange.startOffset, functionRange);
        if (functionName) {
            // can not handle `async functionName`
            const possibleNameOffset = functionRange.startOffset + functionName.length;
            functionNameMap.set(possibleNameOffset, functionRange);
        }

        if (functionName === '<static_initializer>') {
            functionStaticRanges.push(functionRange);
        }

        // cache uncovered
        if (functionRange.count === 0) {
            functionUncoveredRanges.push(functionRange);
        }

    });

    // sort ranges
    Util.sortOffsetRanges(functionUncoveredRanges);

    return {
        functionMap,
        functionNameMap,
        functionStaticRanges,
        functionUncoveredRanges,
        rootRange
    };

};

const getFakeAstInfo = (coverageList) => {
    const functions = [];
    const branches = [];
    const statements = [];
    coverageList.forEach((block) => {
        const {
            isBlockCoverage, functionName, ranges, root
        } = block;

        ranges.forEach((range, i) => {

            const {
                startOffset, endOffset, count
            } = range;

            if (i === 0 && root) {
                return;
            }

            statements.push({
                start: startOffset,
                end: endOffset,
                count
            });

            if (isBlockCoverage) {
                // branches
                branches.push({
                    type: 'branch',
                    start: startOffset,
                    end: endOffset,
                    locations: [{
                        start: startOffset,
                        end: endOffset,
                        count
                    }]
                });
            }

            if (i === 0) {
                // function range
                functions.push({
                    start: startOffset,
                    end: endOffset,
                    bodyStart: startOffset,
                    bodyEnd: endOffset,
                    count,
                    functionName
                });

            }
        });

    });

    // console.log('fake functions', functions.map((it) => it));

    return {
        functions,
        branches,
        statements
    };
};

const getJsAstInfo = (item, coverageList) => {

    const {
        source, fake, empty
    } = item;

    if (fake) {
        return getFakeAstInfo(coverageList);
    }

    const options = {
        ecmaVersion: 'latest',
        // most time for node.js file
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowSuperOutsideMethod: true,
        // first line: #!/usr/bin/env node
        allowHashBang: true
    };

    let err;
    let ast;
    try {
        ast = acorn.parse(source, options);
    } catch (e) {
        err = e;
    }

    if (err) {

        // empty = untested file
        // could be .ts, .vue and so on, that can not be parsed normally
        if (empty) {
            return {
                functions: [],
                branches: [],
                statements: []
            };
        }

        // runtime code should be parsed successful
        Util.logInfo(`Unparsable source: ${item.sourcePath} ${err.message}`);

        // it could be jsx even it is `.js`

        // https://github.com/acornjs/acorn/tree/master/acorn-loose
        // It is recommended to always try a parse with the regular acorn parser first,
        // and only fall back to this parser when that one finds syntax errors.
        ast = acornLoose.parse(source, options);

    }

    const coverageInfo = getCoverageInfo(coverageList);
    coverageInfo.item = item;

    return collectAstInfo(ast, coverageInfo);
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

const addAtRule = (item, coverageList, coveredRanges, empty) => {
    const { name, nodes } = item;

    const defaultCount = empty ? 0 : 1;

    if (['charset', 'import', 'namespace'].includes(name)) {
        addRule(item, coverageList, coveredRanges, defaultCount);
        return;
    }

    if (['media', 'supports', 'container', 'layer'].includes(name)) {

        const childCoverageList = [];
        const count = addCssRules(nodes, childCoverageList, coveredRanges, empty);
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

const addCssRules = (list, coverageList, coveredRanges, empty) => {

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
            addAtRule(item, coverageList, coveredRanges, empty);
        }

    });

    return count;
};

const getCssAstInfo = (item, coverageList) => {

    const {
        source, ranges, empty
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

    const ast = parseCss(source);

    addCssRules(ast.nodes, coverageList, coveredRanges, empty);

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
