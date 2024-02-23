const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const { fileURLToPath, pathToFileURL } = require('url');
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

    if (url.startsWith('file:')) {
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

    const urlObj = Util.resolveUrl(filename, url);
    if (urlObj) {
        return urlObj.toString();
    }

    const mapUrl = Util.resolveUrl(filename, pathToFileURL(url).toString());
    if (mapUrl) {
        return mapUrl.toString();
    }
};

const resolveSourcesContent = (sources, url) => {
    const list = [];
    for (const file of sources) {
        const sourceUrl = Util.resolveUrl(file, url);
        if (sourceUrl) {
            const sourcePath = sourceUrl.toString();
            if (sourcePath.startsWith('file:')) {
                const content = Util.readFileSync(path.resolve(fileURLToPath(sourcePath)));
                list.push(content);
                continue;
            }
        }
        Util.logDebug(EC.red(`failed to load source content ${file}`));
    }
    if (list.length === sources.length) {
        return list;
    }
};

const resolveSourceMap = (data, url) => {
    if (!data) {
        return;
    }
    const {
        sources, sourcesContent, mappings
    } = data;

    if (!sources || !mappings) {
        return;
    }

    // exists sources content
    if (sourcesContent && sourcesContent.length === sources.length) {
        return data;
    }

    // load sources content by sources
    const contents = resolveSourcesContent(sources, url);
    if (contents) {
        data.sourcesContent = contents;
        return data;
    }

};

const saveSourceFile = async (filePath, data) => {
    await Util.writeFile(filePath, JSON.stringify(data));

    // save source and sourcemap file for debug
    // https://evanw.github.io/source-map-visualization
    // if (data.sourceMap) {
    //     await Util.writeFile(`${filePath}.js`, data.source);
    //     await Util.writeFile(`${filePath}.js.map`, JSON.stringify(data.sourceMap));
    // }

};

const collectSourceMaps = async (v8list, options) => {

    const smList = [];
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

        // save source and sourceMap to separated json file
        const sourceData = {
            url,
            id,
            source,
            sourceMap
        };

        // remove comments if not debug
        if (!Util.isDebug()) {
            sourceData.source = convertSourceMap.removeComments(source);
        }

        // check sourceMap only for js
        if (type === 'js' && !sourceData.sourceMap) {
            // from inline sync
            const smc = convertSourceMap.fromSource(source);
            if (smc) {
                sourceData.sourceMap = resolveSourceMap(smc.sourcemap, url);
                smList.push({
                    url,
                    inline: true
                });
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
        const { sourceMapUrl, sourceData } = item;
        const { url } = sourceData;
        const data = await loadSourceMap(sourceMapUrl);
        if (data) {
            sourceData.sourceMap = resolveSourceMap(data, url);
            smList.push({
                url,
                sourceMapUrl
            });
        }
        await saveSourceFile(item.sourcePath, sourceData);
    });

    return smList;

};

module.exports = {
    collectSourceMaps,
    resolveSourceMap
};
