import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { load } from '../../lib/register/hooks.js';

const source = 'module.exports = 42;\n//# sourceMappingURL=subject.js.map\n';

describe('synchronous coverage hooks', function() {
    this.timeout(15000);
    let root;
    let previousCoverageDir;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr register hooks '));
        previousCoverageDir = process.env.NODE_V8_COVERAGE;
        process.env.NODE_V8_COVERAGE = path.join(root, 'coverage');
    });

    afterEach(() => {
        if (typeof previousCoverageDir === 'undefined') {
            delete process.env.NODE_V8_COVERAGE;
        } else {
            process.env.NODE_V8_COVERAGE = previousCoverageDir;
        }
        fs.rmSync(root, {
            recursive: true, force: true
        });
    });

    const savedSources = () => {
        return fs.readdirSync(process.env.NODE_V8_COVERAGE).filter((name) => name.startsWith('source-')).map((name) => {
            return JSON.parse(fs.readFileSync(path.join(process.env.NODE_V8_COVERAGE, name), 'utf8'));
        });
    };

    [
        ['string', source],
        ['Buffer', Buffer.from(source)],
        ['Uint8Array', new TextEncoder().encode(source)],
        ['ArrayBuffer', new TextEncoder().encode(source).buffer]
    ].forEach(([name, content]) => {
        it(`synchronously captures ${name} sources without changing the load result`, () => {
            const url = pathToFileURL(path.join(root, 'subject.cjs')).href;
            const context = {
                format: 'commonjs'
            };
            const loaded = {
                format: 'commonjs', source: content
            };
            let calls = 0;
            const result = load(url, context, (nextURL, nextContext) => {
                calls += 1;
                assert.equal(nextURL, url);
                assert.equal(nextContext, context);
                return loaded;
            });
            assert.equal(calls, 1);
            assert.equal(result, loaded);
            assert.deepEqual(savedSources(), [{
                url, source
            }]);
        });
    });

    it('does not save sources when coverage is disabled', () => {
        delete process.env.NODE_V8_COVERAGE;
        const loaded = {
            format: 'module', source
        };
        assert.equal(load('file:///subject.mjs', {}, () => loaded), loaded);
        assert.equal(fs.existsSync(path.join(root, 'coverage')), false);
    });

    it('ignores built-ins, unsupported formats and sources without sourcemaps', () => {
        for (const [url, loaded] of [
            ['node:fs', {
                format: 'module', source
            }],
            ['file:///subject.json', {
                format: 'json', source
            }],
            ['file:///subject.cjs', {
                format: 'commonjs', source: null
            }],
            ['file:///subject.mjs', {
                format: 'module', source: 'export const value = 42;'
            }]
        ]) {
            assert.equal(load(url, {}, () => loaded), loaded);
        }
        assert.equal(fs.existsSync(process.env.NODE_V8_COVERAGE), false);
    });

    [
        ['require', 'entry.cjs', "require('./subject.cjs');"],
        ['createRequire', 'entry.mjs', "import { createRequire } from 'node:module'; createRequire(import.meta.url)('./subject.cjs');"]
    ].forEach(([name, entry, code]) => {
        it(`captures CommonJS sources loaded with ${name}`, () => {
            const subject = path.join(root, 'subject.cjs');
            fs.writeFileSync(subject, source);
            fs.writeFileSync(path.join(root, entry), code);
            const result = spawnSync(process.execPath, [
                '--import', import.meta.resolve('monocart-coverage-reports/register'), path.join(root, entry)
            ], {
                env: process.env, encoding: 'utf8', timeout: 10000
            });
            assert.ifError(result.error);
            assert.equal(result.status, 0, result.stdout + result.stderr);
            assert.ok(savedSources().some((item) => item.url === pathToFileURL(subject).href && item.source === source));
        });
    });
});
