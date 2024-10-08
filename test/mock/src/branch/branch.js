/* branches test cases */

const AssignmentPattern = require('./assignment.js');
const ConditionalExpression = require('./conditional.js');
const IfStatement = require('./if.js');
const LogicalExpression = require('./logical.js');
const SwitchStatement = require('./switch.js');
const SwitchStatementNoBreak = require('./switch-no-break.js');
const OptionalChaining = require('./optional-chaining.js');

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

const logicalReturn = function(a) {
    if (a < 5 || a > 8) {
        console.log(a);
    }

    // same branch start
    const defaultArg = arguments.length > 1 && typeof arguments[1] !== 'undefined' ? arguments[1] : true;
    console.log(defaultArg);

    // test return count
    if (a < 3) {
        return;
    }

    // count will be left 10 - 2 = 8
    /** multiple lines comments
     * for checking fixRangeStart */
    // comments again
    if (a < 5 || a > 8) {
        console.log(a);
    }

};

const listForEach = function(a) {

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

function coveredFunction(a) {

    // branch count should be 10:0 not 1:0
    const testCountWithFunName = a || 0;
    logicalReturn(a);

    // branches in a block statement
    for (let i = 0, j = 1; i < 5; i++) {
        if (i > 2) {
            console.log(i);
        } else if (i > 100) {
            uncoveredFunction();
        }
    }

    listForEach(a);

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

    constructor(a) {
        // branch count should be 10:0 not 1:0
        const testCountWithFunName = a || 0;
        this.myMethod(a);
    }

    myMethod(a) {

    }

}


function functionNeverMind(a) {
    if (a) {
        console.log(a);
        // not covered
    }
}

const branch = (a) => {

    let i = 0;
    while (i < 10) {
        coveredFunction(i + 1);
        new MyCLass(i + 1);
        i++;
    }


    if (a) {
        // else path should be covered
        functionNeverMind(a);
    }

    // multiple lines and operator after
    /* eslint-disable operator-linebreak */
    if (
        i ||
        a ||
        a + i
    ) {
        console.log('known issue: second line should be uncovered not partial');
    }

    AssignmentPattern();
    ConditionalExpression();
    IfStatement();
    LogicalExpression();
    SwitchStatement();
    SwitchStatementNoBreak();
    OptionalChaining();
};

module.exports = {
    branch
};
