import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import convertSourceMap from 'convert-source-map';

function saveFile(url, source, dir, nativeTypeScript) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

    const id = createHash('sha1').update(url + source + (nativeTypeScript ? '\0typescript' : '')).digest('hex');
    const filePath = path.resolve(dir, `source-${id}.json`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({
            url,
            source,
            ... nativeTypeScript && {
                nativeTypeScript: true
            }
        }));
    }

}

function decodeSource(source) {
    if (ArrayBuffer.isView(source)) {
        return Buffer.from(source.buffer, source.byteOffset, source.byteLength).toString('utf8');
    }
    if (source instanceof ArrayBuffer) {
        return Buffer.from(source).toString('utf8');
    }
    return source;
}

function saveSource(url, loaded, dir) {

    // filter node modules
    if (url.startsWith('node:')) {
        return;
    }

    const { format } = loaded;
    const nativeTypeScript = ['module-typescript', 'commonjs-typescript'].includes(format);
    if (!nativeTypeScript && !['module', 'commonjs'].includes(format)) {
        return;
    }
    const source = decodeSource(loaded.source);
    if (typeof source !== 'string') {
        return;
    }

    if (!nativeTypeScript && !convertSourceMap.mapFileCommentRegex.test(source)) {
        // no sourcemap
        return;
    }

    saveFile(url, source, dir, nativeTypeScript);

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
