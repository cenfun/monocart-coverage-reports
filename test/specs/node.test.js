// silent
const log = console.log;
console.log = () => {};

// test lib app
const {
    foo, bar, app
} = await import('../mock/node/lib/app.js');

// test dist with sourcemap
const {
    component, branch, ignore
} = (await import('../mock/node/dist/coverage-node.js')).default;

foo();
bar();
app();

// console.log(component, branch);

component();
branch();
ignore();

console.log = log;
