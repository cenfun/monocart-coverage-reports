function foo(argument) {
    console.log('this is foo');

    if (argument) {
        console.log('covered foo argument');
    }
}

function bar(argument) {
    console.log('this is bar');

    if (argument) {
        console.log('covered bar argument');
    }
}


function app() {
    console.log('this is app');
}


module.exports = {
    app,
    foo,
    bar
};
