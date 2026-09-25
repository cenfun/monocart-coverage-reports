const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const MCR = require('../../lib/index.js');

describe('all without coverage data', () => {
    let root;
    let srcDir;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-all-'));
        srcDir = path.join(root, 'src');
        fs.mkdirSync(srcDir);
        fs.writeFileSync(path.join(srcDir, 'uncovered.js'), 'function uncovered() { return 42; }\n');
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    for (const reportName of ['v8-json', 'json-summary']) {
        it(`includes untested files with no coverage input (${reportName})`, async () => {
            const inputDir = path.join(root, 'empty-input');
            fs.mkdirSync(inputDir);
            const outputDir = path.join(root, 'reports');
            const result = await MCR({
                logging: 'off',
                all: srcDir,
                inputDir,
                outputDir,
                reports: [reportName]
            }).generate();

            assert.equal(result.type, 'v8');
            assert.equal(result.files.length, 1);
            assert.ok(result.files[0].sourcePath.endsWith('src/uncovered.js'));
            assert.equal(result.summary.lines.pct, 0);
            const reportFile = reportName === 'v8-json' ? 'coverage-report.json' : 'coverage-summary.json';
            assert.ok(fs.existsSync(path.join(outputDir, reportFile)));
        });
    }

    it('permits an empty report when all has no matching files', async () => {
        const result = await MCR({
            logging: 'off',
            all: { dir: srcDir, filter: () => false },
            outputDir: path.join(root, 'reports'),
            reports: ['v8-json']
        }).generate();

        assert.equal(result.files.length, 0);
    });

    it('preserves the no-data behavior without all', async () => {
        const outputDir = path.join(root, 'reports');
        const result = await MCR({ logging: 'off', outputDir }).generate();

        assert.equal(result, undefined);
        assert.equal(fs.existsSync(outputDir), false);
    });
});
