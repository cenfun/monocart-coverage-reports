import fs from 'node:fs';

// remove previous coverage files
const dir = process.env.NODE_V8_COVERAGE;
if (fs.existsSync(dir)) {
    try {
        fs.rmSync(dir, {
            recursive: true,
            force: true,
            maxRetries: 10
        });
    } catch (err) {
        console.log(err.message);
    }
}

// =====================================================
await import('./specs/node.test.js');
// =====================================================
