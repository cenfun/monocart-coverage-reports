const fs = require('fs');

const {
    foo, bar, app
} = require('./app.js');

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
