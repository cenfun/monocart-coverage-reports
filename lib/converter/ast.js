const {
    acorn, acornLoose, acornWalk
} = require('../packages/monocart-coverage-vendor.js');

const Util = require('../utils/util.js');

const isInUncoveredRanges = (fun, uncoveredRanges) => {
    const inRange = uncoveredRanges.find((range) => {
        return fun.start >= range.startOffset && fun.end <= range.endOffset;
    });
    if (inRange) {
        return true;
    }
    return false;
};

const initAstCoverage = (item, coverageList, ast, functions) => {

    const functionRangeMap = new Map();
    const uncoveredRanges = [];

    coverageList.forEach((block) => {
        const { functionName, ranges } = block;

        // first one is function coverage info
        const range = ranges[0];
        range.functionName = functionName;

        const { startOffset, count } = range;

        if (count === 0) {
            uncoveredRanges.push(range);
        }

        const nameOffset = functionName ? startOffset + functionName.length : null;

        // keep range reference to map, will set back the wrap info

        // already exists just add name offset
        if (functionRangeMap.has(startOffset) && nameOffset) {
            functionRangeMap.set(nameOffset, range);
            return;
        }

        // add normal offset
        functionRangeMap.set(startOffset, range);

        // add name offset, the position after name, move right
        if (nameOffset) {
            if (functionRangeMap.has(nameOffset)) {
                return;
            }
            functionRangeMap.set(nameOffset, range);
        }

    });

    // does a 'recursive' walk, where the walker functions are responsible for
    // continuing the walk on the child nodes of their target node.
    acornWalk.recursive(ast, null, {
        VariableDeclarator(node) {
            // id: { type: 'Identifier', name: '__webpack_modules__' },
            const name = node.id && node.id.name;
            // console.log('========================== recursive', name);
            if (name === '__webpack_modules__') {
                // mark all as wrap function
                node.init.properties.forEach((it) => {
                    it.value.wrapKey = it.key && it.key.value;
                });
                // console.log(node.init.properties);
            }
        }
    });

    acornWalk.simple(ast, {

        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node) {
            const functionName = node.id && node.id.name;

            // console.log('==========================', functionName);

            // if (item.sourcePath.endsWith('test-v8-node.js')) {
            //     console.log('ast function', node);
            // }

            let wrap = false;
            if (node.wrapKey) {
                wrap = true;
                // console.log(node.wrapKey);
            }

            functions.push({
                start: node.start,
                end: node.end,
                functionName,
                wrap
            });
        }

        // branches

    });

    functions.sort((a, b) => {
        return a.start - b.start;
    });

    // if (item.sourcePath.endsWith('test-v8-node.js')) {
    //     console.log('==========================================================', item.sourcePath);
    //     console.log('coverage ranges', functionRangeMap);
    //     console.log('ast functions', functions);
    // }

    functions.forEach((fun) => {
        const range = functionRangeMap.get(fun.start);
        // exact matched
        if (range) {
            fun.count = range.count;

            // set wrap back to ranges
            if (fun.wrap) {
                range.wrap = true;
            }

            return;
        }

        // not found the function, could be in or out a range
        // if function in uncovered function should be 0 too
        if (isInUncoveredRanges(fun, uncoveredRanges)) {
            fun.count = 0;
            return;
        }

        // otherwise could be 1 by default
        fun.count = 1;

    });

    functionRangeMap.clear();
    // console.log(functions);

};

const getAstInfo = (item, coverageList) => {

    const { source, js } = item;

    const functions = [];

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

        initAstCoverage(item, coverageList, ast, functions);

    }

    return {
        functions
    };
};


module.exports = {
    getAstInfo
};
