import fs from 'fs';
import path from 'path';
import vue from '@vitejs/plugin-vue';
import EC from 'eight-colors';

import cssInjectedByJs from 'vite-plugin-css-injected-by-js';
import { visualizer } from 'rollup-plugin-visualizer';
import { build as esbuild } from 'esbuild';
import { createScriptLoader } from 'lz-utils';

import { defineConfig } from 'vite';

// Replace with your library id
const ID = 'monocart-coverage-reports';

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

            // Build the dependencies shared by the Node.js runtime into one
            // CommonJS file. Files under lib require this bundle directly.
            const vendorPath = path.resolve(packagesDir, 'monocart-coverage-vendor.js');
            await esbuild({
                entryPoints: [path.resolve(import.meta.dirname, 'src/vendor/index.js')],
                outfile: vendorPath,
                bundle: true,
                platform: 'node',
                format: 'cjs',
                minify: true,
                sourcemap: false
            });
            logBuilt(vendorPath);

            // Package the report template and the browser application so the
            // runtime can generate both inline and external HTML reports.
            const templatePath = path.resolve(import.meta.dirname, 'lib/default/template.html');
            const appPath = path.resolve(import.meta.dirname, `dist/${ID}.js`);
            const assetsPath = path.resolve(packagesDir, 'monocart-coverage-assets.js');

            const assetsMap = {
                template: fs.readFileSync(templatePath, 'utf8'),
                'monocart-coverage-app': createScriptLoader(fs.readFileSync(appPath, 'utf8'))
            };
            fs.writeFileSync(assetsPath, `module.exports = ${JSON.stringify(assetsMap, null, 4)};`);
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
