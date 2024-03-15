const fs = require('fs');
const path = require('path');
const Util = require('../utils/util.js');
const { convertSourceMap } = require('../packages/monocart-coverage-vendor.js');

async function load(url, context, nextLoad) {

    const loaded = await nextLoad(url, context);
    const { source, format } = loaded;
    const dir = process.env.NODE_V8_COVERAGE;

    if (dir && typeof source === 'string' && (format === 'module' || format === 'commonjs')) {

        if (convertSourceMap.mapFileCommentRegex.test(source)) {

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

    }

    return loaded;
}

module.exports = {
    load
};
