const assert = require('node:assert/strict');
const { fork, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cli = path.resolve(__dirname, '../../lib/cli.js');
const outputDir = path.resolve(__dirname, '../../.temp/unit-cli');
const scriptDir = path.resolve(__dirname, '../../.temp/unit-cli-fixture');
const childScript = path.join(scriptDir, 'child args.js');

const run = (commandArgs) => spawnSync(process.execPath, [cli, '--outputDir', outputDir, '--', ...commandArgs], {
    encoding: 'utf8'
});

describe('CLI child command', function() {
    // Windows .cmd startup and instrumentation can exceed Mocha's 2s default.
    this.timeout(15000);

    before(() => {
        fs.mkdirSync(scriptDir, { recursive: true });
        fs.writeFileSync(childScript, [
            'console.log("ARGS:" + JSON.stringify(process.argv.slice(2)));',
            'if (process.argv.includes("--ipc") && process.send) {',
            '    process.send("ready");',
            '    process.on("message", (message) => {',
            '        console.log("IPC:" + message);',
            '        process.disconnect();',
            '    });',
            '}'
        ].join('\n'));
    });

    after(() => {
        fs.rmSync(scriptDir, { recursive: true, force: true });
    });

    it('preserves arguments, including spaces and a child separator', () => {
        const result = run(['node', childScript, 'two words', '--', 'last']);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /ARGS:\["two words","--","last"\]/);
    });

    it('passes shell metacharacters as literal child arguments', () => {
        const result = run(['node', childScript, '&', 'not-a-command', 'console.log(1)']);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /ARGS:\["&","not-a-command","console\.log\(1\)"\]/);
        assert.doesNotMatch(result.stdout, /not-a-command is not recognized/);
    });

    it('propagates the child exit status', () => {
        const result = run(['node', '-e', 'process.exit(7)']);
        assert.equal(result.status, 7, result.stderr);
    });

    it('runs onReady after the child exits', () => {
        const configFile = path.join(scriptDir, 'config.cjs');
        const marker = path.join(scriptDir, 'ready.json');
        fs.writeFileSync(configFile, `module.exports = {
            onReady: async (_report, dir, child) => {
                require('node:fs').writeFileSync(${JSON.stringify(marker)},
                    JSON.stringify({ pid: child.pid, dir }));
            }
        };`);
        const result = spawnSync(process.execPath, [cli, '--outputDir', outputDir, '--config', configFile, '--', 'node', childScript], {
            encoding: 'utf8'
        });
        assert.equal(result.status, 0, result.stderr);
        const ready = JSON.parse(fs.readFileSync(marker, 'utf8'));
        assert.ok(ready.pid);
        assert.match(ready.dir, /\.v8-coverage/);
    });

    it('forwards IPC messages and exits after generating coverage', async () => {
        const child = fork(cli, ['--outputDir', outputDir, '--', 'node', childScript, '--ipc'], {
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
        });
        let output = '';
        let errorOutput = '';
        child.stdout.on('data', (data) => {
            output += data;
        });
        child.stderr.on('data', (data) => {
            errorOutput += data;
        });
        child.on('message', (message) => {
            if (message === 'ready') {
                child.send('hello');
            }
        });
        const timer = setTimeout(() => child.kill(), 10000);
        try {
            const code = await new Promise((resolve, reject) => {
                child.once('error', reject);
                child.once('exit', resolve);
            });
            assert.equal(code, 0, errorOutput);
            assert.match(output, /IPC:hello/);
        } finally {
            clearTimeout(timer);
        }
    });

    if (process.platform === 'win32') {
        it('accepts glob arguments used by child CLIs', () => {
            const result = run(['node', childScript, './test/**/*.js']);
            assert.equal(result.status, 0, result.stderr);
            assert.match(result.stdout, /ARGS:\["\.\/test\/\*\*\/\*\.js"\]/);
        });

        it('can still run Windows .cmd shims', () => {
            const result = run(['npm', '--version', '&', 'not-a-command']);
            assert.equal(result.status, 0, result.stderr);
            assert.match(result.stdout, /\d+\.\d+\.\d+/);
            assert.doesNotMatch(result.stdout, /not-a-command is not recognized/);
        });
    }
});
