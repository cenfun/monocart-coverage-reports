import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { MCR } from '../../lib/index.js';

const cli = fileURLToPath(import.meta.resolve('../../lib/cli.js'));
const entry = import.meta.resolve('../../lib/index.js');

describe('config loading errors', {
    timeout: 15000
}, () => {
    let root;

    const write = (name, content) => {
        const file = path.join(root, name);
        fs.writeFileSync(file, content);
        return file;
    };
    const spawn = (args) => {
        const result = spawnSync(process.execPath, args, {
            cwd: root, encoding: 'utf8', timeout: 10000
        });
        assert.ifError(result.error);
        return result;
    };

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-config-'));
    });
    afterEach(() => {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    [
        ['valid.cjs', 'module.exports = { name: "CJS config" };', 'CJS config'],
        ['valid.mjs', 'export default { name: "ESM config" };', 'ESM config'],
        ['valid.json', '{"name":"JSON config"}', 'JSON config']
    ].forEach(([name, content, title]) => {
        it(`loads valid config: ${name}`, async () => {
            const coverage = MCR({
                logging: 'off'
            });
            await coverage.loadConfig(write(name, content));
            assert.equal(coverage.options.name, title);
        });
    });

    it('rejects a missing explicit config without additional options', async () => {
        const coverage = MCR({
            logging: 'off'
        });
        await assert.rejects(coverage.loadConfig(path.join(root, 'missing.cjs')), /config file does not exist/);
    });

    [
        ['invalid.cjs', 'module.exports = { invalid syntax };'],
        ['invalid.json', '{invalid JSON}'],
        ['throws.cjs', 'throw new Error("config startup failed");']
    ].forEach(([name, content]) => {
        it(`rejects failed config loading and preserves the original cause: ${name}`, async () => {
            const coverage = MCR({
                logging: 'off'
            });
            const file = write(name, content);
            await assert.rejects(coverage.loadConfig(file), (error) => {
                assert.match(error.message, /Failed to load config file/);
                assert.ok(error.message.includes(file));
                assert.ok(error.cause instanceof Error);
                return true;
            });
        });
    });

    [
        ['null', null],
        ['undefined', void 0],
        ['"original startup failure"', 'original startup failure'],
        ['0', 0],
        ['false', false]
    ].forEach(([expression, value]) => {
        it(`preserves non-Error config failures: ${expression}`, async () => {
            const coverage = MCR({
                logging: 'off'
            });
            const file = write('non-error.mjs', `throw ${expression};`);
            await assert.rejects(coverage.loadConfig(file), (error) => {
                assert.equal(error.message, `Failed to load config file "${file}": ${String(value)}`);
                assert.ok(Object.hasOwn(error, 'cause'));
                assert.strictEqual(error.cause, value);
                return true;
            });
        });
    });

    ['null', '"original startup failure"'].forEach((expression) => {
        it(`reports non-Error config failures through the CLI: ${expression}`, () => {
            write('non-error.cjs', `throw ${expression};`);
            const result = spawn([cli, 'test', '-c', 'non-error.cjs']);
            assert.notEqual(result.status, 0);
            assert.match(result.stdout + result.stderr, /Failed to load config file.*non-error\.cjs/);
            assert.ok((result.stdout + result.stderr).includes(expression.replaceAll('"', '')));
            assert.doesNotMatch(result.stdout + result.stderr, /Cannot read properties|: undefined/);
        });
    });

    it('allows no default config when none was requested', () => {
        const result = spawn(['-e', `
            import(${JSON.stringify(entry)}).then(({ MCR }) => MCR({ logging: 'off' }).loadConfig()).catch((error) => {
                console.error(error.message); process.exitCode = 1;
            });
        `]);
        assert.equal(result.status, 0, result.stdout + result.stderr);
    });

    it('rejects a discovered default config that fails to load', () => {
        write('mcr.config.cjs', 'throw new Error("broken default config");');
        const result = spawn(['-e', `
            import(${JSON.stringify(entry)}).then(({ MCR }) => MCR({ logging: 'off' }).loadConfig()).catch((error) => {
                console.error(error.message); process.exitCode = 1;
            });
        `]);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Failed to load config file.*broken default config/);
    });

    [
        ['merge'],
        [process.execPath, 'run.cjs']
    ].forEach((command) => {
        [false, true].forEach((broken) => {
            it(`fails ${command[0]} for ${broken ? 'broken' : 'missing'} config without executing children`, () => {
                write('run.cjs', "require('fs').writeFileSync('executed', 'yes');");
                if (broken) {
                    write('bad.cjs', 'throw new Error("invalid config");');
                }
                const result = spawn([cli, ... command, '-c', broken ? 'bad.cjs' : 'missing.cjs']);
                assert.notEqual(result.status, 0);
                assert.match(result.stdout + result.stderr, /config file does not exist|Failed to load config file/);
                assert.equal(fs.existsSync(path.join(root, 'executed')), false);
            });
        });
    });
});
