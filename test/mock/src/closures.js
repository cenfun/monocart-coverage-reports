function functionDefineAfterReturn(v) {

    if (!v) {
        functionAfterReturn();
        return functionAfterReturn();
    }

    missed1();
    missed2();

    return v;

    // comments
    function missed1() {
        console.log('missed1');
    }

    function functionAfterReturn(a) {
        if (a) {
            return a;
        }
        covered();
        return 'Hello';
    }

    function missed2() {
        console.log('missed2');
    }

    function covered() {
        console.log('covered');
    }
}


module.exports = () => {
    functionDefineAfterReturn();
};
