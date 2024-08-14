const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const { getSnapshot, diffSnapshot } = require('../lib/');

module.exports = function(coverageResults) {

    const snapDir = path.resolve(__dirname, 'snapshot');
    if (!fs.existsSync(snapDir)) {
        fs.mkdirSync(snapDir, {
            recursive: true
        });
    }

    const newSnapshot = getSnapshot(coverageResults);
    const id = coverageResults.reportPath.split('/')[1];
    const snapPath = path.resolve(snapDir, `${id}.snapshot.json`);

    if (!fs.existsSync(snapPath) || process.env.TEST_SNAPSHOT) {
        fs.writeFileSync(snapPath, JSON.stringify(newSnapshot, null, 4));
        return;
    }

    const oldSnapshot = JSON.parse(fs.readFileSync(snapPath).toString('utf-8'));

    const diff = diffSnapshot(oldSnapshot, newSnapshot, {
        // skipEqual: false,
        // showSummary: false,
        maxCols: 30,
        metrics: []
    });

    const snapName = path.basename(snapPath);
    if (diff.change) {
        EC.logRed(`❌ ERROR: Snapshot does not match reference: ${snapName}`);
        console.log(diff.message);
        process.exit(1);
    } else {
        EC.logGreen(`✅ Snapshot matched: ${snapName}`);
    }

};
