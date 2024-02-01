/* branches test cases */

const AssignmentPattern = require('./assignment.js');
const ConditionalExpression = require('./conditional.js');
const IfStatement = require('./if.js');
const LogicalExpression = require('./logical.js');
const SwitchStatement = require('./switch.js');

const uncoveredFunction = () => {
    const list = [1, 2, 3, 4, 5];
    list.forEach((v) => {
        console.log(v);
    });
};

function coveredFunction() {
    // branches in a block statement
    for (let i = 0; i < 5; i++) {
        if (i > 2) {
            console.log(i);
        } else if (i > 100) {
            uncoveredFunction();
        }
    }

    const list = [1, 2, 3, 4, 5];
    list.forEach((v) => {
        if (v > 2) {
            console.log(v);
            return;
        }
        console.log(v);
    });

    for (const item of list) {
        if (item > 3) {
            console.log(item);
            break;
        }
        console.log(item);
    }

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

const branch = () => {

    coveredFunction();
    coveredFunction();

    AssignmentPattern();
    ConditionalExpression();
    IfStatement();
    LogicalExpression();
    SwitchStatement();

};

module.exports = {
    branch
};
