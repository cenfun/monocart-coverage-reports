/* branches test cases */
/* eslint-disable default-case */

const mixedStatement = (tf1, tf2) => {
    if (tf1) {
        const a = tf2 || 2;
        if (a) {
            console.log(a);
        }
    }

    if (tf1) {
        const a = tf1 || 2;
        if (a) {
            console.log(a);
        }
    }
};

// 5 x 10 = 50 ( (count if) x 2 )
const IfStatement = (tf1, tf2) => {

    if (tf1) {
        console.log('if1');
    }

    if (tf1) {
        console.log('if2');
    } else if (tf2) {
        console.log('ifelse2');
    }

    if (tf1) {
        console.log('if3');
    } else if (tf2) {
        console.log('ifelse3');
    } else {
        console.log('else3');
    }

    mixedStatement(tf1, tf2);
};

const IfStatement_11 = (tf1, tf2) => {

    if (tf1) {
        console.log('if1');
    }

    if (tf1) {
        console.log('if2');
    } else if (tf2) {
        console.log('ifelse2');
    }

    if (tf1) {
        console.log('if3');
    } else if (tf2) {
        console.log('ifelse3');
    } else {
        console.log('else3');
    }

    IfStatement(tf1, tf2);

};
const IfStatement_10 = (tf1, tf2) => {

    if (tf1) {
        console.log('if1');
    }

    if (tf1) {
        console.log('if2');
    } else if (tf2) {
        console.log('ifelse2');
    }

    if (tf1) {
        console.log('if3');
    } else if (tf2) {
        console.log('ifelse3');
    } else {
        console.log('else3');
    }

    IfStatement(tf1, tf2);

};
const IfStatement_01 = (tf1, tf2) => {

    if (tf1) {
        console.log('if1');
    }

    if (tf1) {
        console.log('if2');
    } else if (tf2) {
        console.log('ifelse2');
    }

    if (tf1) {
        console.log('if3');
    } else if (tf2) {
        console.log('ifelse3');
    } else {
        console.log('else3');
    }

    IfStatement(tf1, tf2);

};
const IfStatement_00 = (tf1, tf2) => {

    if (tf1) {
        console.log('if1');
    }

    if (tf1) {
        console.log('if2');
    } else if (tf2) {
        console.log('ifelse2');
    }

    if (tf1) {
        console.log('if3');
    } else if (tf2) {
        console.log('ifelse3');
    } else {
        console.log('else3');
    }

    IfStatement(tf1, tf2);

};


// 5 x 4 = 20
const ConditionalExpression = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
};
const ConditionalExpression_11 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
    ConditionalExpression(tf1, tf2);
};
const ConditionalExpression_10 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
    ConditionalExpression(tf1, tf2);
};
const ConditionalExpression_01 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
    ConditionalExpression(tf1, tf2);
};
const ConditionalExpression_00 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
    ConditionalExpression(tf1, tf2);
};

// 5 x 5 = 25
const LogicalExpression = (tf1, tf2) => {
    const a = tf1 || tf2;
    const b = tf2 || tf1 || a;
    console.log(b);
};
const LogicalExpression_11 = (tf1, tf2) => {
    const a = tf1 || tf2;
    const b = tf2 || tf1 || a;
    console.log(b);
    LogicalExpression(tf1, tf2);
};
const LogicalExpression_10 = (tf1, tf2) => {
    const a = tf1 || tf2;
    const b = tf2 || tf1 || a;
    console.log(b);
    LogicalExpression(tf1, tf2);
};
const LogicalExpression_01 = (tf1, tf2) => {
    const a = tf1 || tf2;
    const b = tf2 || tf1 || a;
    console.log(b);
    LogicalExpression(tf1, tf2);
};
const LogicalExpression_00 = (tf1, tf2) => {
    const a = tf1 || tf2;
    const b = tf2 || tf1 || a;
    console.log(b);
    LogicalExpression(tf1, tf2);
};

// 4 + 3 + 4 + 4 + 4 + 3 = 22
const SwitchStatement = (n) => {
    switch (n) {
        case 1:
            console.log(1);
            break;
        case 2:
        case 3:
            console.log(2);
            break;
        default:
            console.log('default');
    }
};
const SwitchStatement_1 = (n) => {
    switch (n) {
        case 1:
            console.log(1);
            break;
        case 2:
        case 3:
            console.log(2);
    }
    SwitchStatement(n);
};
const SwitchStatement_2 = (n) => {
    switch (n) {
        case 1:
            console.log(1);
            break;
        case 2:
        case 3:
            console.log(2);
            break;
        default:
            console.log('default');
    }
    SwitchStatement(n);
};
const SwitchStatement_3 = (n) => {
    switch (n) {
        case 1:
            console.log(1);
            break;
        case 2:
        case 3:
            console.log(2);
            break;
        default:
            console.log('default');
    }
    SwitchStatement(n);
};
const SwitchStatement_4 = (n) => {
    switch (n) {
        case 1:
            console.log(1);
            break;
        case 2:
        case 3:
            console.log(2);
            break;
        default:
            console.log('default');
    }
    SwitchStatement(n);
};
const SwitchStatement_5 = (n) => {
    switch (n) {
        case 1:
            console.log(1);
            break;
        case 2:
        case 3:
            console.log(2);
            break;
    }
    SwitchStatement(n);
};

// AssignmentPattern
// ((a = 0) => {
//     console.log(a);
// })();

const branch = () => {

    IfStatement_11(true, true);
    IfStatement_10(true, false);
    IfStatement_01(false, true);
    IfStatement_00(false, false);

    ConditionalExpression_11(true, true);
    ConditionalExpression_10(true, false);
    ConditionalExpression_01(false, true);
    ConditionalExpression_00(false, false);

    LogicalExpression_11(true, true);
    LogicalExpression_10(true, false);
    LogicalExpression_01(false, true);
    LogicalExpression_00(false, false);

    SwitchStatement_1(1);
    SwitchStatement_2(2);
    SwitchStatement_3(3);
    SwitchStatement_4(4);
    SwitchStatement_5(5);
};

export default branch;
