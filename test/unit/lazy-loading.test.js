import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const entry = import.meta.resolve('../../lib/index.js');
const register = import.meta.resolve('../../lib/register/register.js');

const run = (blocked, code) => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import { registerHooks } from 'node:module';
        registerHooks({
            load(url, context, nextLoad) {
                const blocked = ${JSON.stringify(blocked)};
                if (blocked.some((part) => url.includes(part))) {
                    throw new Error('Unexpected eager dependency: ' + url);
                }
                return nextLoad(url, context);
            }
        });
        ${code}
    `], {
        encoding: 'utf8', timeout: 15000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
};

describe('lazy runtime dependencies', function() {
    this.timeout(20000);
    let root;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-lazy-'));
        fs.mkdirSync(path.join(root, 'src'));
        fs.writeFileSync(path.join(root, 'src/subject.js'), 'const covered = 1;\n');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    it('imports the API without conversion, HTML, Istanbul, WebSocket or ZIP dependencies', () => {
        run([
            '/converter/converter.js',
            'monocart-coverage-converter.js',
            'monocart-coverage-assets.js',
            '/istanbul/istanbul.js',
            'istanbul-lib-',
            '/node_modules/ws/',
            '/node_modules/yazl/',
            '/node_modules/node-stream-zip/'
        ], `
            const { MCR, CDPClient } = await import(${JSON.stringify(entry)});
            if (typeof MCR !== 'function' || typeof CDPClient !== 'function') throw new Error('Invalid API');
        `);
    });

    it('preloads coverage hooks without the general vendor bundle', () => {
        run([
            'monocart-coverage-vendor.js',
            'monocart-coverage-converter.js',
            '/node_modules/ws/',
            '/node_modules/yazl/',
            '/node_modules/node-stream-zip/'
        ], `await import(${JSON.stringify(register)});`);
    });

    it('generates V8 JSON without HTML, Istanbul, WebSocket or ZIP dependencies', () => {
        run([
            'monocart-coverage-assets.js',
            '/istanbul/istanbul.js',
            'istanbul-lib-',
            '/node_modules/ws/',
            '/node_modules/yazl/',
            '/node_modules/node-stream-zip/'
        ], `
            const { MCR } = await import(${JSON.stringify(entry)});
            const report = await MCR({
                logging: 'off',
                all: ${JSON.stringify(path.join(root, 'src'))},
                outputDir: ${JSON.stringify(path.join(root, 'reports'))},
                reports: ['v8-json'],
                outputFilter: '**/subject.js'
            }).generate();
            if (report.files.length !== 1) throw new Error('Missing V8 file');
        `);
    });

    it('loads ZIP readers and writers independently', () => {
        const outputDir = path.join(root, 'raw-report');
        run(['/node_modules/node-stream-zip/', '/node_modules/ws/'], `
            const { MCR } = await import(${JSON.stringify(entry)});
            await MCR({
                logging: 'off',
                all: ${JSON.stringify(path.join(root, 'src'))},
                outputDir: ${JSON.stringify(outputDir)},
                reports: [['raw', { zip: true }]]
            }).generate();
        `);
        const zip = path.join(outputDir, 'raw.zip');
        assert.ok(fs.statSync(zip).size > 0);
        run(['/node_modules/yazl/', '/node_modules/ws/'], `
            const { MCR } = await import(${JSON.stringify(entry)});
            const report = await MCR({
                logging: 'off',
                inputDir: ${JSON.stringify(zip)},
                outputDir: ${JSON.stringify(path.join(root, 'merged'))},
                reports: ['v8-json']
            }).generate();
            if (report.files.length !== 1) throw new Error('Missing ZIP coverage');
        `);
    });

    [true, false].forEach((inline) => {
        it(`loads HTML resources on demand (inline: ${inline})`, () => {
            const outputDir = path.join(root, 'html');
            run(['/node_modules/ws/', '/node_modules/yazl/', '/node_modules/node-stream-zip/', '/istanbul/istanbul.js'], `
                const { MCR } = await import(${JSON.stringify(entry)});
                const report = await MCR({
                    logging: 'off',
                    all: ${JSON.stringify(path.join(root, 'src'))},
                    outputDir: ${JSON.stringify(outputDir)},
                    inline: ${inline}, reports: ['v8']
                }).generate();
                if (report.files.length !== 1) throw new Error('Missing HTML file');
            `);
            const html = fs.readFileSync(path.join(outputDir, 'index.html'), 'utf8');
            assert.ok(html.includes('<script'));
            if (inline) {
                assert.ok(html.includes('window.reportData'));
            } else {
                assert.ok(fs.statSync(path.join(outputDir, 'coverage-data.js')).size > 0);
                assert.ok(fs.statSync(path.join(outputDir, 'assets/monocart-coverage-app.js')).size > 0);
            }
        });
    });
});
