const fs = require('fs');
const path = require('path');
const Util = require('../utils/util.js');
const { convertSourceMap } = require('../packages/monocart-coverage-vendor.js');

function saveFile(url, source, dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }

    const id = Util.calculateSha1(url + source);
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

    const { source, format } = loaded;
    if (typeof source !== 'string' || !['module', 'commonjs'].includes(format)) {
        // no source or wrong format
        return;
    }

    if (!convertSourceMap.mapFileCommentRegex.test(source)) {
        // no sourcemap
        return;
    }

    saveFile(url, source, dir);

}

async function load(url, context, nextLoad) {
    const loaded = await nextLoad(url, context);
    const dir = process.env.NODE_V8_COVERAGE;
    if (dir) {
        // only for coverage enabled
        saveSource(url, loaded, dir);
    }
    return loaded;
}

module.exports = {
    load
};
