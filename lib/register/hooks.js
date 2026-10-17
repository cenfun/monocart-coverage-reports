import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import convertSourceMap from 'convert-source-map';

function saveFile(url, source, dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

    const id = createHash('sha1').update(url + source).digest('hex');
    const filePath = path.resolve(dir, `source-${id}.json`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({
            url,
            source
        }));
    }

}

function saveSource(url, loaded, dir) {

    // filter node modules
    if (url.startsWith('node:')) {
        return;
    }

    const { format } = loaded;
    if (!['module', 'commonjs'].includes(format)) {
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

    if (!convertSourceMap.mapFileCommentRegex.test(source)) {
        // no sourcemap
        return;
    }

    saveFile(url, source, dir);

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
