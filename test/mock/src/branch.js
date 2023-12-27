/* branches test cases */

const ConditionalExpression = require('./branch/conditional.js');
const IfStatement = require('./branch/if.js');
const LogicalExpression = require('./branch/logical.js');
const SwitchStatement = require('./branch/switch.js');

const coveredFunction = () => {
    for (let i = 0; i < 3; i++) {
        if (i > 1) {
            console.log(i);
        }
    }
};

coveredFunction.uncoveredFunction = () => {
    for (let i = 0; i < 3; i++) {
        if (i > 1) {
            console.log(i);
        }
    }
};


// AssignmentPattern
// ((a = 0) => {
//     console.log(a);
// })();

const branch = () => {
    coveredFunction();

    ConditionalExpression();
    IfStatement();
    LogicalExpression();
    SwitchStatement();

};

module.exports = branch;
