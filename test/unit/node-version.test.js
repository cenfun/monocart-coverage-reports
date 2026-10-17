import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import pkg from '../../package.json' with { type: 'json' };
import lock from '../../package-lock.json' with { type: 'json' };

describe('Node.js runtime metadata', () => {
    it('keeps package and lockfile release metadata consistent', () => {
        assert.equal(pkg.engines.node, '>=22.15.0');
        assert.equal(lock.version, pkg.version);
        assert.equal(lock.packages[''].version, pkg.version);
        assert.deepEqual(lock.packages[''].engines, pkg.engines);
    });

    it('reports the package version through the CLI', () => {
        const result = spawnSync(process.execPath, [fileURLToPath(import.meta.resolve('../../lib/cli.js')), '--version'], {
            encoding: 'utf8', timeout: 10000
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), pkg.version);
    // Allow the child-process deadline to expire before Mocha's, even in parallel runs.
    }).timeout(15000);
});
