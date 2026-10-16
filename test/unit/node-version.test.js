const assert = require('assert');
const { spawnSync } = require('child_process');
const pkg = require('../../package.json');
const lock = require('../../package-lock.json');

describe('Node.js runtime metadata', () => {
    it('keeps package and lockfile release metadata consistent', () => {
        assert.equal(pkg.engines.node, '>=22.12.0');
        assert.equal(lock.version, pkg.version);
        assert.equal(lock.packages[''].version, pkg.version);
        assert.deepEqual(lock.packages[''].engines, pkg.engines);
    });

    it('reports the package version through the CLI', () => {
        const result = spawnSync(process.execPath, [require.resolve('../../lib/cli.js'), '--version'], {
            encoding: 'utf8', timeout: 10000
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout.trim(), pkg.version);
    });
});
