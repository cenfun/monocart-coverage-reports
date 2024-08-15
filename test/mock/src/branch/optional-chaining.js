/**
 * Currently, The `Optional chaining` will be counted as:
 * ✅ bytes coverage
 * ✅ lines coverage
 * ❌ not branches coverage
 */

const adventurer = {
    name: 'Alice',
    cat: {
        name: 'Dinah'
    }
};

// obj.val?.prop
// obj.val?.[expr]
// obj.func?.(args)

function OptionalChaining() {

    console.log(adventurer.cat?.name);

    // Expected output: undefined
    console.log(adventurer.dog?.name);

    // Expected output: undefined
    console.log(adventurer.someNonExistentMethod?.());

    console.log(adventurer.cat?.first?.second);
}

module.exports = () => {
    OptionalChaining();
};
