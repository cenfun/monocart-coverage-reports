import fs from 'fs';
import path from 'path';
import vue from '@vitejs/plugin-vue';
import EC from 'eight-colors';

import cssInjectedByJs from 'vite-plugin-css-injected-by-js';
import { visualizer } from 'rollup-plugin-visualizer';
import { build as esbuild } from 'esbuild';
import { createScriptLoader } from 'lz-utils';

import { defineConfig } from 'vite';
import vendorLicense from './scripts/generate-vendor-license.js';

// Replace with your library id
const ID = 'monocart-coverage-app';

const timestamp = (postfix) => {
    let ts = new Date(Date.now() - new Date().getTimezoneOffset() * 60 * 1000).toISOString().slice(2, 19);
    ts = ts.replace(/[-:]/g, '');
    ts = ts.replace('T', '-');
    if (postfix) {
        ts = `${ts}-${postfix}`;
    }
    return ts;
};

const getCommit = () => {
    const headPath = path.resolve('.git/HEAD');
    if (fs.existsSync(headPath)) {
        const rev = fs.readFileSync(headPath).toString().trim();
        if (rev.indexOf(':') === -1) {
            return rev.slice(0, 8);
        }
        const refPath = rev.split(':').pop().trim();
        return fs.readFileSync(`.git/${refPath}`).toString().trim().slice(0, 8);
    }
    return '';
};

const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));

const tag = {
    timestamp: timestamp(),
    commit: getCommit()
};

const prepareDevData = () => {
    const dataFile = 'coverage-data.js';
    const sourcePath = path.resolve(import.meta.dirname, `docs/v8/${dataFile}`);
    const targetPath = path.resolve(import.meta.dirname, `dist/${dataFile}`);

    fs.mkdirSync(path.dirname(targetPath), {
        recursive: true
    });

    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`copied test data: ${path.relative(import.meta.dirname, targetPath)}`);
    } else {
        fs.writeFileSync(targetPath, '');
        console.warn(`test data not found, created an empty file: ${path.relative(import.meta.dirname, targetPath)}`);
    }

};

function buildEndPlugin() {
    return {
        name: 'build-end',
        async closeBundle() {
            const packagesDir = path.resolve(import.meta.dirname, 'lib/packages');
            fs.rmSync(packagesDir, {
                force: true,
                recursive: true,
                maxRetries: 10
            });
            fs.mkdirSync(packagesDir, {
                recursive: true
            });

            const logBuilt = (filePath) => {
                const size = (fs.statSync(filePath).size / 1024).toFixed(2);
                console.log(`built ${path.relative(import.meta.dirname, filePath)} ${EC.yellow(`${size} kB`)}`);
            };

            // Aggregate small dependency graphs into two feature bundles.
            // Standalone runtime packages are imported directly by lib.
            const vendorPath = path.resolve(packagesDir, 'monocart-coverage-vendor.js');
            const vendorBuild = await esbuild({
                entryPoints: Object.fromEntries(Object.entries({
                    vendor: 'index',
                    converter: 'converter'
                }).map(([name, entry]) => [
                    `monocart-coverage-${name}`, path.resolve(import.meta.dirname, `src/vendor/${entry}.js`)
                ])),
                outdir: packagesDir,
                splitting: true,
                chunkNames: 'chunks/[name]-[hash]',
                bundle: true,
                platform: 'node',
                format: 'esm',
                // Bundled CommonJS dependencies still require Node built-ins.
                banner: {
                    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"
                },
                minify: true,
                legalComments: 'none',
                sourcemap: false,
                metafile: true
            });
            for (const output of Object.keys(vendorBuild.metafile.outputs)) {
                logBuilt(path.resolve(output));
            }
            const vendorLicensePath = `${vendorPath}.LICENSE`;
            vendorLicense.generateVendorLicense(vendorBuild.metafile, import.meta.dirname, vendorLicensePath);
            logBuilt(vendorLicensePath);

            // Package the report template and the browser application so the
            // runtime can generate both inline and external HTML reports.
            const templatePath = path.resolve(import.meta.dirname, 'lib/default/template.html');
            const appPath = path.resolve(import.meta.dirname, `dist/${ID}.js`);
            const assetsPath = path.resolve(packagesDir, 'monocart-coverage-assets.js');

            const assetsMap = {
                template: fs.readFileSync(templatePath, 'utf8'),
                'monocart-coverage-app': createScriptLoader(fs.readFileSync(appPath, 'utf8'))
            };
            fs.writeFileSync(assetsPath, `const assetsMap = ${JSON.stringify(assetsMap, null, 4)};\nexport { assetsMap };\n`);
            logBuilt(assetsPath);
        }
    };
}

export default defineConfig(({ command, mode }) => {

    const define = {
        'window.TAG': JSON.stringify(Object.values(tag).join('-')),
        'window.VERSION': JSON.stringify(pkg.version)
    };

    if (command === 'serve') {
        prepareDevData();
        return {
            root: '.',
            publicDir: 'public',
            define,
            plugins: [vue()],
            server: {
                open: '/'
            }
        };
    }

    // Production build (library)
    return {
        root: '.',
        plugins: [
            vue(),
            cssInjectedByJs(),
            visualizer({
                filename: '.temp/build-stats.html'
            }),
            buildEndPlugin()
        ],
        publicDir: false,
        define,
        build: {
            outDir: 'dist',
            rolldownOptions: {
                input: path.resolve(import.meta.dirname, 'src/app/index.js'),
                output: {
                    format: 'iife',
                    name: 'MonocartCoverageReports',
                    entryFileNames: `${ID}.js`
                }
            },
            chunkSizeWarningLimit: 1000,
            sourcemap: false,
            cssCodeSplit: false,
            emptyOutDir: true
        }
    };
});
