const fs = require('fs');

// test lib app
const {
    foo, bar, app
} = require('./lib/app.js');
// test dist with sourcemap
const { component, branch } = require('./dist/coverage-node.js');

// remove previous coverage files
const dir = process.env.NODE_V8_COVERAGE;
if (fs.existsSync(dir)) {
    fs.rmSync(dir, {
        recursive: true,
        force: true
    });
}

foo();
bar();
app();

console.log(component, branch);

component();
branch();
