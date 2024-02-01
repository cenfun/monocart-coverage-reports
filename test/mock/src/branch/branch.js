/* branches test cases */

const AssignmentPattern = require('./assignment.js');
const ConditionalExpression = require('./conditional.js');
const IfStatement = require('./if.js');
const LogicalExpression = require('./logical.js');
const SwitchStatement = require('./switch.js');

const branch = () => {

    AssignmentPattern();
    ConditionalExpression();
    IfStatement();
    LogicalExpression();
    SwitchStatement();

};

module.exports = {
    branch
};
