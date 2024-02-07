/* branches test cases */

const AssignmentPattern = require('./assignment.js');
const ConditionalExpression = require('./conditional.js');
const IfStatement = require('./if.js');
const LogicalExpression = require('./logical.js');
const SwitchStatement = require('./switch.js');

const uncoveredFunction = (a) => {
    const list = [1, 2, 3, 4, 5];
    list.forEach((v) => {
        console.log(v);
    });

    if (a) {
        // both if and else path are uncovered
        console.log(a);
    }
};

const listForEach = (a) => {
    const list = [1, 2, 3, 4, 5];
    list.forEach((v) => {
        if (v > 2) {
            console.log(v);
            return;
        }
        console.log(v);
    });

    if (!a) {
        // else path should be uncovered
        console.log(a);
    }

    for (const item of list) {
        if (item > 3) {
            console.log(item);
            break;
        }
        console.log(item);
    }
};

function coveredFunction() {
    // branches in a block statement
    for (let i = 0, j = 1; i < 5; i++) {
        if (i > 2) {
            console.log(i);
        } else if (i > 100) {
            uncoveredFunction();
        }
    }

    listForEach();

    const l = 5;
    let i = 0;
    while (i < l) {
        if (i < 3) {
            console.log(i);
        } else {
            console.log(i);
        }
        i++;
    }

}

class MyCLass {
    static propTypes = 1;
    #privateField = 42;
    static #privateKey = 2;
}

function functionNeverMind(a) {
    if (a) {
        console.log(a);
        // not covered
    }
}

const branch = (a) => {

    coveredFunction();
    coveredFunction();

    if (a) {
        // else path should be covered
        functionNeverMind(a);
    }

    AssignmentPattern();
    ConditionalExpression();
    IfStatement();
    LogicalExpression();
    SwitchStatement();

};

module.exports = {
    branch
};
