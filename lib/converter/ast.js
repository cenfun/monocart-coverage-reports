const {
    acorn, acornLoose, parseCss
} = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const {
    createBranches, collectBranches, findInRanges
} = require('./branches.js');

const getFunctionRange = (start, end, state) => {

    const {
        functionMap, functionNameMap, functionRanges
    } = state;

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
    return findInRanges(start, end, functionRanges);
};

const collectAstInfo = (ast, state) => {

    const functions = [];
    const branchMap = new Map();

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
        Function(node) {

            const {
                start, end, id
            } = node;
            const functionName = id && id.name;

            const functionInfo = {
                start,
                end,
                functionName,
                // js default to 1
                count: 1
            };

            if (node._wrapKey) {
                functionInfo.wrap = true;
            }

            const range = getFunctionRange(start, end, state);
            if (range) {
                functionInfo.count = range.count;
                functionInfo.range = range;
                // set wrap back to range
                if (functionInfo.wrap) {
                    range.wrap = true;
                }
            }

            functions.push(functionInfo);

            createBranches(node.body, functionInfo, branchMap);

        }

    });

    const branches = collectBranches(branchMap);

    return {
        functions,
        branches
    };

};

const generateCountState = (coverageList) => {
    const functionRanges = [];
    const functionNameMap = new Map();
    coverageList.forEach((block) => {
        const { functionName, ranges } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        functionRange.functionName = functionName;
        if (functionName) {
            functionNameMap.set(functionRange.startOffset + functionName.length, functionRange);
        }

        // blocks
        const len = ranges.length;
        if (len > 1) {
            const blockRanges = [].concat(ranges);
            // remove first one
            blockRanges.shift();
            blockRanges.sort((a, b) => {
                return a.startOffset - b.startOffset;
            });
            const blockMap = new Map();
            blockRanges.forEach((item) => {
                blockMap.set(item.startOffset, item);
            });
            functionRange.blockMap = blockMap;
            functionRange.blockRanges = blockRanges;
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
        functionRanges
    };

};

const getJsAstInfo = (item, coverageList) => {

    // not for css
    if (!item.js) {
        return {
            functions: [],
            branches: []
        };
    }

    const { source } = item;

    const options = {
        ecmaVersion: 'latest',
        // most time for node.js file
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

    const state = generateCountState(coverageList);
    // state.item = item;

    return collectAstInfo(ast, state);
};

// =========================================================================================================

const addCssRules = (rules, coverageList, coveredRanges, locator) => {
    let hasCovered = false;
    // line and line is 1-base
    rules.forEach((rule) => {

        const { type, position } = rule;

        if (type === 'comment') {
            return;
        }

        const { start, end } = position;

        // both 1-base
        // console.log(start, end);
        const startOffset = locator.locationToOffset({
            line: start.line,
            column: start.column - 1
        });

        const endOffset = locator.locationToOffset({
            line: end.line,
            column: end.column - 1
        });

        // start should offset @media
        if (type === 'media') {
            // rules in media
            // console.log('media', rule.media, startOffset, endOffset);
            const childCoverageList = [];
            const hasChildCovered = addCssRules(rule.rules, childCoverageList, coveredRanges, locator);
            if (hasChildCovered) {
                childCoverageList.forEach((it) => {
                    coverageList.push(it);
                });
                return;
            }

            // add whole media as uncovered
            coverageList.push({
                start: startOffset,
                end: endOffset,
                count: 0
            });
            return;
        }

        let count = 0;
        if (type === 'charset') {
            count = 1;
        } else {
            const coveredRange = findInRanges(startOffset, endOffset, coveredRanges);
            if (coveredRange) {
                count = 1;
                hasCovered = true;
            }
        }

        coverageList.push({
            start: startOffset,
            end: endOffset,
            count
        });

    });

    return hasCovered;
};

const getCssAstInfo = (item, locator) => {

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

    const coverageList = [];
    addCssRules(ast.rules, coverageList, coveredRanges, locator);

    return {
        coverageList
    };
};


module.exports = {
    getJsAstInfo,
    getCssAstInfo
};
