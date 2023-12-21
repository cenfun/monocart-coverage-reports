const {
    acorn, acornLoose, acornWalk
} = require('../packages/monocart-coverage-vendor.js');

const initAstCoverage = (item, coverageList, ast, functions) => {

    const rangeMap = new Map();
    coverageList.forEach((block) => {
        const { functionName, ranges } = block;
        // first one is function coverage info
        const range = ranges[0];
        const { startOffset } = range;

        const nameOffset = functionName ? startOffset + functionName.length : null;

        // keep range reference to map, will set back the wrap info

        // already exists just add name offset
        if (rangeMap.has(startOffset) && nameOffset) {
            rangeMap.set(nameOffset, range);
            return;
        }

        // add normal offset
        rangeMap.set(startOffset, range);

        // add name offset, the position after name, move right
        if (nameOffset) {
            if (rangeMap.has(nameOffset)) {
                return;
            }
            rangeMap.set(nameOffset, range);
        }

    });

    // console.log('==========================================================', item.sourcePath);

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

            let wrap = false;
            if (node.wrapKey) {
                wrap = true;
                // console.log(node.wrapKey);
            }

            functions.push({
                wrap,
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

    functions.forEach((fun) => {
        const range = rangeMap.get(fun.start);
        if (range) {
            fun.count = range.count;

            // set wrap back to ranges
            if (fun.wrap) {
                range.wrap = true;
            }

            return;
        }

        // not found the function, could be uncovered
        fun.count = 0;
        // console.log('uncovered', fun);

    });

    rangeMap.clear();
    // console.log(functions);

};

const getAstInfo = (item, coverageList) => {

    const { source, js } = item;

    const functions = [];

    // not for css
    if (js) {

        const options = {
            ecmaVersion: 'latest'
        };

        let ast;
        try {
            ast = acorn.parse(source, options);
        } catch (e) {
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
