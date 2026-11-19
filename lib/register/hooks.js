import fs from 'node:fs';
import path from 'node:path';
import { threadId } from 'node:worker_threads';
import { calculateSha1 } from '../utils/source-id.js';
import convertSourceMap from 'convert-source-map';

const typeScriptFormats = new Set(['module-typescript', 'commonjs-typescript']);
const scriptFormats = new Set(['module', 'commonjs', ... typeScriptFormats]);

function saveFile(url, source, dir, nativeTypeScript) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

    // Match Node's coverage PID/thread, then index by URL without reading sources.
    // Keep native loading facts separate even when another loader returns the same text.
    const id = `${process.pid}-${threadId}-${calculateSha1(url)}-${calculateSha1(source)}${nativeTypeScript ? '-ts' : ''}`;
    const filePath = path.resolve(dir, `source-${id}.json`);
    if (!fs.existsSync(filePath)) {
        const data = {
            url, source
        };
        if (nativeTypeScript) {
            data.nativeTypeScript = true;
        }
        fs.writeFileSync(filePath, JSON.stringify(data));
    }

}

function saveSource(url, loaded, dir) {

    // filter node modules
    if (url.startsWith('node:')) {
        return;
    }

    const { format } = loaded;
    const typeScript = typeScriptFormats.has(format);
    if (!scriptFormats.has(format)) {
        return;
    }
    let { source } = loaded;
    if (ArrayBuffer.isView(source)) {
        source = Buffer.from(source.buffer, source.byteOffset, source.byteLength).toString('utf8');
    } else if (source instanceof ArrayBuffer) {
        source = Buffer.from(source).toString('utf8');
    }
    if (typeof source !== 'string') {
        return;
    }

    if (!typeScript && !convertSourceMap.mapFileCommentRegex.test(source)) {
        // Native TS needs its original source even without a sourcemap.
        return;
    }

    saveFile(url, source, dir, typeScript);

}

function load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    const dir = process.env.NODE_V8_COVERAGE;
    if (dir) {
        // only for coverage enabled
        saveSource(url, loaded, dir);
    }
    return loaded;
}

export { load };
