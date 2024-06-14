function functionDefineAfterReturn(v) {

    if (!v) {
        foo();
        return foo();
    }

    return v;

    function foo() {
        return 'Hello';
    }
}


module.exports = () => {
    functionDefineAfterReturn();
};
