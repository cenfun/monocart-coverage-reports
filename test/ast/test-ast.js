const fs = require('fs');
const path = require('path');

const { acorn, acornWalk } = require('../../lib/packages/monocart-coverage-vendor.js');
const baseVisitor = acornWalk.base;

const visitAst = (rootNode, visitors) => {
    const parents = [rootNode];
    const visitor = (node, st, override) => {
        const type = override || node.type;
        // console.log('visit', node.type, override, parents.length);
        const handler = visitors[type];
        let res;
        if (handler) {
            res = handler(node, parents);
        }
        if (res === 'break') {
            return;
        }
        const isNew = node !== parents[parents.length - 1];
        if (isNew) {
            parents.push(node);
        }
        baseVisitor[type](node, st, visitor);
        if (isNew) {
            parents.pop();
        }
    };
    visitor(rootNode);
};

const testChild = (fNode) => {

    visitAst(fNode, {

        Function(node, st) {
            console.log('function break', '===========================================');
            return 'break';
        },

        IfStatement(node, parents) {
            console.log('child function if', parents.map((it) => it.type));
        }

    });

};

const test = () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'example.js')).toString('utf-8');

    const options = {
        ecmaVersion: 'latest',
        allowReturnOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowSuperOutsideMethod: true,
        // first line: #!/usr/bin/env node
        allowHashBang: true
    };

    const ast = acorn.parse(source, options);

    visitAst(ast, {

        // Function include FunctionDeclaration, ArrowFunctionExpression, FunctionExpression
        Function(node, parents) {

            console.log('function', parents.map((it) => it.type));


            testChild(node.body);

            // if (parents.length > 4) {
            //     return 'break';
            // }

        }

        // IfStatement(node, parents) {
        //     console.log('if', parents.length);
        // }

    });

};

test();
