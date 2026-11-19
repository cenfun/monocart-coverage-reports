import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import pkg from '../../package.json' with { type: 'json' };
import lock from '../../package-lock.json' with { type: 'json' };

it('requires Node.js 22.18+ consistently in the manifest and lockfile', () => {
    assert.equal(pkg.engines.node, '>=22.18.0');
    assert.equal(lock.packages[''].engines.node, pkg.engines.node);
});

describe('CLI version', () => {
    // Allow the child-process deadline to expire before the test runner's.
    it('reports the package version through the CLI', {
        timeout: 15000
    }, () => {
        const result = spawnSync(process.execPath, [fileURLToPath(import.meta.resolve('../../lib/cli.js')), '--version'], {
            encoding: 'utf8', timeout: 10000
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), pkg.version);
    });
});
