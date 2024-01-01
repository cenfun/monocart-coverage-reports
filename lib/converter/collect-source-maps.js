const fs = require('fs');
const EC = require('eight-colors');
const { fileURLToPath } = require('url');
const Concurrency = require('../platform/concurrency.js');
const { convertSourceMap, axios } = require('../packages/monocart-coverage-vendor.js');

const Util = require('../utils/util.js');

const request = async (options) => {
    if (typeof options === 'string') {
        options = {
            url: options
        };
    }
    let err;
    const res = await axios(options).catch((e) => {
        err = e;
    });
    return [err, res];
};

const loadSourceMap = async (url = '') => {

    if (url.startsWith('file://')) {
        const p = fileURLToPath(url);
        const content = Util.readFileSync(p);
        if (!content) {
            Util.logDebug(EC.red(`failed to load sourcemap ${p}`));
            return;
        }
        return JSON.parse(content);
    }

    const [err, res] = await request({
        url
    });

    if (err) {
        Util.logDebug(EC.red(`${err.message} ${url}`));
        return;
    }

    return res.data;
};

const getSourceMapUrl = (content, url) => {

    const m = content.match(convertSourceMap.mapFileCommentRegex);
    if (!m) {
        return;
    }

    const comment = m.pop();
    const r = convertSourceMap.mapFileCommentRegex.exec(comment);
    // for some odd reason //# .. captures in 1 and /* .. */ in 2
    const filename = r[1] || r[2];

    let mapUrl;

    try {
        mapUrl = new URL(filename, url);
    } catch (e) {
        Util.logDebug(EC.red(`${e.message} ${filename} ${url}`));
    }
    if (mapUrl) {
        return mapUrl.toString();
    }
};

const resolveSourceMap = (data) => {
    if (data) {
        const {
            sources, sourcesContent, mappings
        } = data;
        if (!sources || !sourcesContent || !mappings) {
            return;
        }
        return data;
    }
};

const saveSourceFile = async (filePath, data) => {
    await Util.writeFile(filePath, JSON.stringify(data));
};

const collectSourceMaps = async (v8list, options) => {

    let count = 0;
    const concurrency = new Concurrency();
    for (const item of v8list) {

        const {
            type, url, id, source, sourceMap
        } = item;

        // source and sourceMap will be saved as separated file (could be cached)
        // just keep functions coverage ( could be multiple times, will be merged )
        // so remove source and sourceMap
        delete item.source;
        delete item.sourceMap;

        // source and sourceMap already saved
        const sourcePath = Util.resolveCacheSourcePath(options.cacheDir, id);
        if (fs.existsSync(sourcePath)) {
            continue;
        }

        const sourceData = {
            url,
            id,
            // source
            source: convertSourceMap.removeComments(source),
            // could be existed
            sourceMap
        };

        // check sourceMap only for js
        if (type === 'js' && !sourceData.sourceMap) {
            // from inline sync
            const smc = convertSourceMap.fromSource(source);
            if (smc) {
                sourceData.sourceMap = resolveSourceMap(smc.sourcemap);
                count += 1;
                await saveSourceFile(sourcePath, sourceData);
                continue;
            }
            // from url async
            const sourceMapUrl = getSourceMapUrl(source, item.url);
            if (sourceMapUrl) {
                concurrency.addItem({
                    sourceMapUrl,
                    sourcePath,
                    sourceData
                });
                continue;
            }
        }

        // no need check sourceMap
        await saveSourceFile(sourcePath, sourceData);

    }

    // from url concurrency
    await concurrency.start(async (item) => {
        const sourceData = item.sourceData;
        const data = await loadSourceMap(item.sourceMapUrl);
        if (data) {
            sourceData.sourceMap = resolveSourceMap(data);
            count += 1;
        }
        await saveSourceFile(item.sourcePath, sourceData);
    });

    return count;

};

module.exports = collectSourceMaps;
