// silent
const log = console.log;
console.log = () => {};

// test lib app
const {
    foo, bar, app
} = require('../mock/node/lib/app.js');

// test dist with sourcemap
const {
    component, branch, ignore
} = require('../mock/node/dist/coverage-node.js');

foo();
bar();
app();

// console.log(component, branch);

component();
branch();
ignore();

console.log = log;
