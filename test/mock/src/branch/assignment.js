
// AssignmentPattern
// no v8 coverage data for default arguments, count as covered always

const AssignmentPattern_0 = (a = 1, b = 2) => {
    console.log(a, b);
};

const AssignmentPattern = (a, b = 2) => {
    console.log(a, b);
};

function uncoveredAssignmentPattern(a, b = 2, c = 3) {
    console.log(a, b, c);
}

module.exports = () => {
    AssignmentPattern_0(0, 0);

    AssignmentPattern(0, 0);
    AssignmentPattern();
};
