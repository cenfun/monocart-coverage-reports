const fs = require('fs');

// remove previous coverage files
const dir = process.env.NODE_V8_COVERAGE;
if (fs.existsSync(dir)) {
    fs.rmSync(dir, {
        recursive: true,
        force: true
    });
}

// =====================================================
const testDemo = require('./specs/node.test.js');
testDemo();
// =====================================================
