
const ConditionalExpression_11 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
};
const ConditionalExpression_10 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
};
const ConditionalExpression_01 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
};
const ConditionalExpression_00 = (tf1, tf2) => {
    const a = tf1 ? 'true' : 'false';
    console.log(a);
    const b = tf2 ? 'true' : 'false';
    console.log(b);
};


// IfStatement
// const IfStatement = (tf1, tf2) => {

//     if (tf1) {
//         console.log('if1');
//     }

//     if (tf1) {
//         console.log('if2');
//     } else if (tf2) {
//         console.log('ifelse2');
//     }

//     if (tf1) {
//         console.log('if3');
//     } else if (tf2) {
//         console.log('ifelse3');
//     } else {
//         console.log('else3');
//     }

// };


// SwitchStatement
// ((a) => {

//     switch (a) {
//         case 1:
//             console.log(1);
//             break;
//         case 2:
//         case 3:
//             console.log(2);
//             break;
//         default:
//             console.log('default');
//     }

// })();

const LogicalExpression_11 = (tf1, tf2) => {
    const a = tf1 || 0;
    const b = tf2 || a || 1;
    console.log(b);
};
const LogicalExpression_10 = (tf1, tf2) => {
    const a = tf1 || 0;
    const b = tf2 || a || 1;
    console.log(b);
};
const LogicalExpression_01 = (tf1, tf2) => {
    const a = tf1 || 0;
    const b = tf2 || a || 1;
    console.log(b);
};
const LogicalExpression_00 = (tf1, tf2) => {
    const a = tf1 || 0;
    const b = tf2 || a || 1;
    console.log(b);
};


// AssignmentPattern
// ((a = 0) => {
//     console.log(a);
// })();

const branch = () => {

    LogicalExpression_11(true, true);
    LogicalExpression_10(true, false);
    LogicalExpression_01(false, true);
    LogicalExpression_00(false, false);

    ConditionalExpression_11(true, true);
    ConditionalExpression_10(true, false);
    ConditionalExpression_01(false, true);
    ConditionalExpression_00(false, false);

    // ConditionalExpression(tf1, tf2);
    // IfStatement(tf1, tf2);
};

export default branch;
