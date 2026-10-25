import {
    describe, it, beforeEach, afterEach
} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { customReport } from '../../lib/reports/custom.js';
import { createTempRoot } from './unit-utils.js';

const source = `class Reporter {
    constructor(options, globalOptions) {
        this.options = options;
        this.globalOptions = globalOptions;
    }
    async generate(data) {
        return { data, options: this.options, globalOptions: this.globalOptions };
    }
}`;

describe('V8/both custom reporter modules', () => {
    let root;
    beforeEach(() => {
        root = createTempRoot('mcr custom # ');
        fs.writeFileSync(path.join(root, 'package.json'), '{"type":"commonjs"}');
    });
    afterEach(() => fs.rmSync(root, {
        recursive: true, force: true
    }));

    ['mjs', 'cjs'].forEach((extension) => {
        ['absolute', 'relative', 'url'].forEach((format) => {
            it(`loads a ${extension} reporter using a ${format} path`, async () => {
                const file = path.join(root, `reporter.${extension}`);
                fs.writeFileSync(file, `${source}\n${extension === 'mjs' ? 'export default Reporter;' : 'module.exports = Reporter;'}`);
                const names = {
                    absolute: file,
                    relative: `./${path.relative(process.cwd(), file)}`,
                    url: pathToFileURL(file).href
                };
                const name = names[format];
                const data = {
                    type: 'v8'
                };
                const options = {
                    custom: true
                };
                const globalOptions = {
                    outputDir: 'reports'
                };
                assert.deepEqual(await customReport(name, data, options, globalOptions), {
                    data, options, globalOptions
                });
            });
        });
    });

    it('uses native ESM resolution without extension or directory fallbacks', async () => {
        fs.writeFileSync(path.join(root, 'index.js'), `${source}\nmodule.exports = Reporter;`);
        await assert.rejects(customReport(path.join(root, 'index'), {}, {}, {}), {
            code: 'ERR_MODULE_NOT_FOUND'
        });
        await assert.rejects(customReport(root, {}, {}, {}), {
            code: 'ERR_UNSUPPORTED_DIR_IMPORT'
        });
    });

    it('rejects missing reporters instead of silently skipping them', async () => {
        await assert.rejects(customReport(path.join(root, 'missing.cjs'), {}, {}, {}), /missing/);
    });

    ['mjs', 'cjs'].forEach((extension) => {
        it(`preserves ${extension} initialization failures`, async () => {
            const file = path.join(root, `broken.${extension}`);
            fs.writeFileSync(file, "throw new Error('reporter startup failed');");
            await assert.rejects(customReport(file, {}, {}, {}), /reporter startup failed/);
        });
    });
});
