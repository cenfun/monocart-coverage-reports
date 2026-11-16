import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import DefaultMCR, {
    MCR, CoverageReport, CoverageClient, Util
} from 'monocart-coverage-reports';
import * as converter from 'monocart-coverage-reports/converter';
import { Util as publicUtil } from 'monocart-coverage-reports/util';

describe('ESM package', {
    timeout: 15000
}, () => {

    it('does not expose default exports through secondary entry points', async () => {
        for (const specifier of ['monocart-coverage-reports/converter', 'monocart-coverage-reports/util']) {
            const exports = await import(specifier);
            assert.equal(Object.hasOwn(exports, 'default'), false, specifier);
        }
    });

    it('exposes the same factory through default and named imports', () => {
        assert.equal(DefaultMCR, MCR);
        assert.ok(DefaultMCR() instanceof CoverageReport);
        assert.ok(MCR() instanceof CoverageReport);
    });

    it('attaches every other API export to MCR', async () => {
        const api = await import('monocart-coverage-reports');
        for (const [name, value] of Object.entries(api)) {
            if (name !== 'default' && name !== 'MCR') {
                assert.equal(DefaultMCR[name], value, name);
            }
        }
        assert.equal(publicUtil, Util);
        assert.equal(typeof converter.convertV8List, 'function');
    });

    it('exposes a usable CoverageClient constructor through named and factory exports', () => {
        const session = {
            send: () => Promise.resolve({})
        };
        const client = new CoverageClient(session);
        assert.equal(client.session, session);
        assert.ok(client instanceof DefaultMCR.CoverageClient);
        assert.ok(new MCR.CoverageClient(session) instanceof CoverageClient);
    });

    it('supports dynamic import from CommonJS consumers', () => {
        const entry = import.meta.resolve('monocart-coverage-reports');
        const result = spawnSync(process.execPath, ['--input-type=commonjs', '-e', `
            import(${JSON.stringify(entry)}).then(({ default: DefaultMCR, MCR, CoverageReport }) => {
                if (DefaultMCR !== MCR || !(DefaultMCR() instanceof CoverageReport)) process.exitCode = 1;
            }).catch((error) => { console.error(error); process.exitCode = 1; });
        `], {
            encoding: 'utf8', timeout: 10000
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
    });

    for (const extension of ['mjs', 'cjs']) {
        it(`covers ${extension} programs through the ESM preload`, () => {
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr esm preload '));
            try {
                const source = 'console.log(\'covered\');\n//# sourceMappingURL=subject.js.map\n';
                const subject = path.join(root, `subject.${extension}`);
                fs.writeFileSync(subject, source);
                const coverageDir = path.join(root, 'coverage');
                const register = import.meta.resolve('monocart-coverage-reports/register');
                const result = spawnSync(process.execPath, ['--import', register, subject], {
                    env: {
                        ... process.env, NODE_V8_COVERAGE: coverageDir
                    },
                    encoding: 'utf8',
                    timeout: 10000
                });
                assert.ifError(result.error);
                assert.equal(result.status, 0, result.stdout + result.stderr);
                const sources = fs.readdirSync(coverageDir).filter((name) => name.startsWith('source-')).map((name) => {
                    return JSON.parse(fs.readFileSync(path.join(coverageDir, name), 'utf8'));
                });
                assert.ok(sources.some((entry) => entry.url === pathToFileURL(subject).href && entry.source === source));
                const coverage = fs.readdirSync(coverageDir).filter((name) => name.startsWith('coverage-')).flatMap((name) => {
                    return JSON.parse(fs.readFileSync(path.join(coverageDir, name), 'utf8')).result;
                });
                assert.ok(coverage.some((entry) => entry.url === pathToFileURL(subject).href));
            } finally {
                fs.rmSync(root, {
                    recursive: true, force: true
                });
            }
        });
    }
});
