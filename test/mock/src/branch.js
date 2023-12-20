// AssignmentPattern
const fun = (a = 0) => {

    // LogicalExpression
    const b = a || 2;

    const c = a || b || 3;
    console.log(c);

    // single if
    // if (a) {
    //     console.log(a);
    // }

    // if (a) {
    //     console.log(a);
    // } else if (b) {
    //     console.log(b);
    // }

    // switch (a) {
    //     case 1:
    //         console.log(1);
    //         break;
    //     case 2:
    //     case 3:
    //         console.log(1);
    //         break;
    //     default:
    //         console.log('default');
    // }

    return b;
};


fun();
