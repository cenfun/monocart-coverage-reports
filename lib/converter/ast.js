const { acornLoose, acornWalk } = require('../packages/monocart-coverage-vendor.js');

// var isWrapFunction

const initAstCoverage = (coverageList, ast, functions) => {

    const countMap = new Map();
    coverageList.forEach((block) => {
        const { functionName, ranges } = block;
        // first one is function coverage info
        const range = ranges[0];
        const { startOffset } = range;

        const functionInfo = {
            functionName,
            ... range
        };

        const nameOffset = functionName ? startOffset + functionName.length : null;

        // already exists just add name offset
        if (countMap.has(startOffset) && nameOffset) {
            countMap.set(nameOffset, functionInfo);
            return;
        }

        // add normal offset
        countMap.set(startOffset, functionInfo);

        // add name offset, the position after name, move right
        if (nameOffset) {
            if (countMap.has(nameOffset)) {
                // console.log('====================================', functionInfo);
                return;
            }
            countMap.set(nameOffset, functionInfo);
        }

    });

    acornWalk.ancestor(ast, {
        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node, st, ancestors) {

            // how to know is wrap functions
            // console.log(node);
            // if (node.start === 621) {
            //     console.log('--------------------------------------------------------');
            //     console.log(ancestors);
            // }


            const functionName = node.id && node.id.name;
            functions.push({
                start: node.start,
                end: node.end,
                functionName
            });
        }

        // branches

    });

    functions.sort((a, b) => {
        return a.start - b.start;
    });

    // if (countMap.get(789168)) {
    //     console.log('==========================================================');
    //     console.log(functions.filter((it) => it.start > 788168 && it.start < 799168));
    // }

    functions.forEach((fun) => {
        const countInfo = countMap.get(fun.start);
        if (countInfo) {
            fun.count = countInfo.count;
            return;
        }

        // not found the function, could be uncovered
        fun.count = 0;
        // console.log('uncovered', fun);

    });

    countMap.clear();
    // console.log(functions);

};

const getAstInfo = (source, js, coverageList) => {

    // css also support, but css need handle something like: @charset "UTF-8";
    const ast = acornLoose.parse(source, {
        ecmaVersion: 'latest'
    });

    const functions = [];
    if (js) {
        initAstCoverage(coverageList, ast, functions);
    }

    return {
        functions
    };
};


module.exports = {
    getAstInfo
};
