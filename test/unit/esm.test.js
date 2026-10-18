import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';
import DefaultMCR, {
    MCR,
    CoverageReport, CoverageClient, getSnapshot, diffSnapshot, WSSession, CDPClient, Util
} from 'monocart-coverage-reports';
import * as converter from 'monocart-coverage-reports/converter';
import { Util as publicUtil } from 'monocart-coverage-reports/util';
import pkg from 'monocart-coverage-reports/package.json' with { type: 'json' };

describe('ESM package', function() {
    this.timeout(15000);

    it('publishes one native ESM entry', () => {
        assert.equal(pkg.type, 'module');
        assert.equal(pkg.main, './lib/index.js');
        assert.deepEqual(pkg.exports['.'], {
            types: './lib/index.d.ts', default: './lib/index.js'
        });
        assert.equal(pkg.exports['./register'], './lib/register/register.js');
        assert.equal(fs.existsSync(new URL('../../lib/index.mjs', import.meta.url)), false);
    });

    it('uses named exports outside the main entry, including generated packages', () => {
        const libDir = fileURLToPath(new URL('../../lib/', import.meta.url));
        const files = fs.readdirSync(libDir, {
            recursive: true
        }).filter((name) => name.endsWith('.js'));
        for (const file of files) {
            const source = fs.readFileSync(path.join(libDir, file), 'utf8');
            const ast = parse(source, {
                ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true
            });
            if (file !== 'index.js') {
                assert.equal(ast.body.some((node) => node.type === 'ExportDefaultDeclaration'), false, file);
                assert.equal(ast.body.some((node) => node.type === 'ExportNamedDeclaration' && node.specifiers.some((specifier) => specifier.exported.name === 'default')), false, file);
            }
        }
    });

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
        for (const [name, value] of Object.entries({
            CoverageReport, CoverageClient, getSnapshot, diffSnapshot, WSSession, CDPClient, Util
        })) {
            assert.equal(MCR[name], value);
        }
        assert.equal(publicUtil, Util);
        assert.equal(typeof converter.convertV8List, 'function');
    });

    it('exposes a usable CoverageClient constructor through named and factory exports', () => {
        const session = { send: async () => ({}) };
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
                assert.equal(fileURLToPath(register).endsWith('register.js'), true);
            } finally {
                fs.rmSync(root, {
                    recursive: true, force: true
                });
            }
        });
    }
});
