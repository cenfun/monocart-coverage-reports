import fs from 'node:fs';
import path from 'node:path';
import EC from 'eight-colors';
import { getSnapshot, diffSnapshot } from '../lib/index.js';

export default function(coverageResults) {

    const snapDir = path.resolve(import.meta.dirname, 'snapshot');
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

}
