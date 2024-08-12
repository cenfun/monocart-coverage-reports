// all branches should be covered  3/3
function SwitchStatementNoBreak(a) {
    let result = 0;
    switch (a) {
        case 1:
            result++;
        case 2:
            result++;
        default:
            result++;
    }
    return result;
}

module.exports = () => {
    SwitchStatementNoBreak(1);
    SwitchStatementNoBreak(2);
    SwitchStatementNoBreak(3);
};
