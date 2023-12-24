const { acorn, acornLoose } = require('../packages/monocart-coverage-vendor.js');
const Util = require('../utils/util.js');

const { collectBranches, findInRanges } = require('./branches.js');

const getFunctionRange = (start, end, state) => {

    const { functionMap, functionRanges } = state;

    if (!functionRanges.length) {
        return;
    }

    // exact matched in functionMap
    const range = functionMap.get(start);
    if (range) {
        return range;
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
                    it.value.wrapKey = it.key && it.key.value;
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

            const range = getFunctionRange(start, end, state);

            let wrap = false;
            if (node.wrapKey) {
                wrap = true;
                // console.log('wrapKey', node.wrapKey);

                // set wrap back to range
                if (range) {
                    range.wrap = true;
                }

            }

            const count = range ? range.count : 1;

            const functionInfo = {
                start,
                end,
                functionName,
                wrap,
                count,
                range
            };

            functions.push(functionInfo);

            collectBranches(node.body, functionInfo, branchMap);

        }

    });

    // init branches
    const branches = [];
    branchMap.forEach((it) => {
        branches.push(it);
    });

    // sort branches
    branches.sort((a, b) => {
        return a.loc.start - b.loc.start;
    });

    return {
        functions,
        branches
    };

};

const generateCountState = (coverageList) => {
    const functionRanges = [];

    coverageList.forEach((block) => {
        const { functionName, ranges } = block;

        // first one is function coverage info
        const functionRange = ranges[0];
        functionRange.functionName = functionName;

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
        functionRanges
    };

};

const getAstInfo = (item, coverageList) => {

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


module.exports = {
    getAstInfo
};
