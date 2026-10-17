import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(import.meta.resolve('../../lib/cli.js'));

describe('CLI signal handling', function() {
    this.timeout(15000);

    for (const signal of ['SIGINT', 'SIGTERM']) {
        it(`finishes coverage and retains ${signal} after the child exits gracefully`, async function() {
            // Windows process.kill() forcibly terminates the parent instead of
            // delivering a catchable POSIX signal.
            if (process.platform === 'win32') {
                this.skip();
            }
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-signal-'));
            fs.writeFileSync(path.join(root, 'subject.cjs'), 'module.exports = (v) => v ? 42 : 0;');
            fs.writeFileSync(path.join(root, 'child.cjs'), `
                require('./subject.cjs')(true);
                const timer = setInterval(() => {}, 1000);
                process.on(${JSON.stringify(signal)}, () => clearInterval(timer));
                console.log('child-ready');
            `);
            fs.writeFileSync(path.join(root, 'mcr.config.cjs'), `module.exports = {
                outputDir: 'reports', reports: ['v8-json'],
                entryFilter: (entry) => entry.url.endsWith('/subject.cjs'),
                onEnd: () => { process.exitCode = 0; }
            };`);
            const worker = spawn(process.execPath, [cli, '--', process.execPath, 'child.cjs'], {
                cwd: root,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let output = '';
            let sent = false;
            const timeout = setTimeout(() => worker.kill('SIGKILL'), 10000);
            try {
                const result = await new Promise((resolve, reject) => {
                    worker.once('error', reject);
                    worker.once('close', (code, exitSignal) => resolve({
                        code, signal: exitSignal
                    }));
                    worker.stderr.on('data', (chunk) => {
                        output += chunk;
                    });
                    worker.stdout.on('data', (chunk) => {
                        output += chunk;
                        if (!sent && output.includes('child-ready')) {
                            sent = true;
                            worker.kill(signal);
                        }
                    });
                });
                assert.equal(sent, true, output);
                assert.deepEqual(result, {
                    code: null, signal
                }, output);
                const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-report.json'), 'utf8'));
                assert.equal(report.files.length, 1);
                assert.equal(fs.existsSync(path.join(root, 'reports/.v8-coverage')), false);
            } finally {
                clearTimeout(timeout);
                fs.rmSync(root, {
                    recursive: true, force: true
                });
            }
        });
    }
});
