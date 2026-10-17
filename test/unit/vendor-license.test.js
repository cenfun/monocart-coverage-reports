import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import vendorLicense from '../../scripts/generate-vendor-license.js';

const { generateVendorLicense } = vendorLicense;

describe('vendor license collection', () => {
    let root;
    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-vendor-license-'));
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
            name: 'fixture', type: 'module'
        }));
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    const addPackage = (name, version = '1.0.0') => {
        const dir = path.join(root, 'node_modules', name);
        fs.mkdirSync(dir, {
            recursive: true
        });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
            name, version, type: 'module', main: 'index.js', sideEffects: false
        }));
        fs.writeFileSync(path.join(dir, 'LICENSE'), `License for ${name}@${version}`);
        fs.writeFileSync(path.join(dir, 'index.js'), 'export default 42;\n');
        return dir;
    };

    const generate = (metafile) => {
        const outputPath = path.join(root, 'vendor.LICENSE');
        generateVendorLicense(metafile, root, outputPath);
        return fs.readFileSync(outputPath, 'utf8');
    };

    it('includes emitted packages but excludes external and tree-shaken dependencies', async () => {
        addPackage('included');
        addPackage('shaken');
        addPackage('external');
        fs.writeFileSync(path.join(root, 'entry.js'), [
            "import value from 'included';",
            "import 'shaken';",
            "import external from 'external';",
            'console.log(value, external);'
        ].join('\n'));
        const result = await build({
            absWorkingDir: root,
            entryPoints: ['entry.js'],
            bundle: true,
            format: 'esm',
            platform: 'node',
            external: ['external'],
            outfile: 'vendor.js',
            write: false,
            metafile: true,
            logOverride: {
                'ignored-bare-import': 'silent'
            }
        });
        // Parsed input alone is not proof that a package made it into a bundle.
        assert.ok(Object.keys(result.metafile.inputs).some((input) => input.includes('shaken')));
        assert.ok(result.metafile.outputs['vendor.js'].imports.some((item) => item.path === 'external' && item.external));
        const license = generate(result.metafile);
        assert.ok(license.includes('License for included@1.0.0'));
        assert.ok(!license.includes('shaken@'));
        assert.ok(!license.includes('external@'));
        assert.ok(!license.includes('fixture@'));
    });

    it('deduplicates chunks and ignores zero-byte inputs while resolving nested manifests', () => {
        const dir = addPackage('@scope/included');
        fs.mkdirSync(path.join(dir, 'dist'));
        fs.writeFileSync(path.join(dir, 'dist/package.json'), '{"type":"module"}');
        fs.writeFileSync(path.join(dir, 'dist/index.js'), 'export const value = 1;');
        const input = 'node_modules/@scope/included/dist/index.js';
        // Nonexistent input would fail if collection incorrectly walked all inputs.
        const missing = 'node_modules/not-bundled/index.js';
        const license = generate({
            inputs: {
                [input]: {}, [missing]: {}
            },
            outputs: {
                'vendor.js': {
                    inputs: {
                        [input]: {
                            bytesInOutput: 20
                        },
                        [missing]: {
                            bytesInOutput: 0
                        }
                    }
                },
                'chunks/shared.js': {
                    inputs: {
                        [input]: {
                            bytesInOutput: 10
                        }
                    }
                }
            }
        });
        assert.equal(license.split('License for @scope/included@1.0.0').length - 1, 1);
        assert.ok(!license.includes('not-bundled'));
    });

    it('does not collect licenses when no dependency contributes code', () => {
        const license = generate({
            inputs: {
                'node_modules/not-bundled/index.js': {}
            },
            outputs: {
                'vendor.js': {
                    inputs: {}
                }
            }
        });
        assert.ok(license.includes('THIRD-PARTY SOFTWARE NOTICES'));
        assert.ok(!license.includes('NOTICES AND INFORMATION BEGIN HERE'));
    });

    it('keeps direct runtime packages out of the actual vendor notices', () => {
        const license = fs.readFileSync(new URL('../../lib/packages/monocart-coverage-vendor.js.LICENSE', import.meta.url), 'utf8');
        for (const name of ['minimatch', 'find-up', 'supports-color', 'postcss', 'diff-sequences']) {
            assert.ok(license.includes(`\n- ${name}@`), name);
        }
        for (const name of ['convert-source-map', '@jridgewell/sourcemap-codec', 'ws', 'yazl', 'node-stream-zip']) {
            assert.ok(!license.includes(`\n- ${name}@`), name);
        }
    });
});
