const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const { fileURLToPath, pathToFileURL } = require('url');
const Concurrency = require('../platform/concurrency.js');
const { convertSourceMap } = require('../packages/monocart-coverage-vendor.js');
const { flattenSourceMaps } = require('./flatten-source-maps.js');

const Util = require('../utils/util.js');

const defaultSourceMapResolver = async (url = '') => {

    if (url.startsWith('file:')) {
        const p = fileURLToPath(url);
        const content = Util.readFileSync(p);
        if (!content) {
            Util.logDebug(EC.red(`failed to load sourcemap ${p}`));
            return;
        }
        return Util.jsonParse(content);
    }

    const [err, res] = await Util.request(url);

    if (err) {
        Util.logDebug(EC.red(`${err.message} ${url}`));
        return;
    }

    const content = res.data;

    // could be string not json, if Content-Type is application/octet-stream
    if (typeof content === 'string') {
        return Util.jsonParse(content);
    }

    return content;
};

const loadSourceMap = async (url, options) => {
    if (typeof options.sourceMapResolver === 'function') {
        const content = await options.sourceMapResolver(url, defaultSourceMapResolver);
        if (typeof content === 'string') {
            return Util.jsonParse(content);
        }
        return content;
    }
    return defaultSourceMapResolver(url);
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

const resolveSourcesContent = (data, url) => {

    const { sources, sourcesContent } = data;

    // sources [1,2,3]
    // sourcesContent could be [null, null, "content"]
    // some of contents could be missed

    let hasSourceContent = false;
    sources.forEach((file, i) => {
        if (typeof sourcesContent[i] === 'string') {
            hasSourceContent = true;
            return;
        }

        const sourceUrl = Util.resolveUrl(file, url);
        if (sourceUrl) {
            let sourcePath = sourceUrl.toString();
            // could be no `file:`
            if (sourcePath.startsWith('file:')) {
                sourcePath = fileURLToPath(sourcePath);
            }
            const content = Util.readFileSync(path.resolve(sourcePath));
            if (typeof content === 'string') {
                sourcesContent[i] = content;
                hasSourceContent = true;
                return;
            }
        }

        sourcesContent[i] = '';
        Util.logDebug(EC.red(`failed to load source content: ${file}`));

    });


    if (hasSourceContent) {
        return data;
    }
};

const checkSourcesContent = (data) => {
    const { sourcesContent, sources } = data;

    if (!sourcesContent) {
        data.sourcesContent = [];
        return false;
    }

    // all should be string, could be [null]
    const contents = sourcesContent.filter((content) => typeof content === 'string');
    if (contents.length === sources.length) {
        return true;
    }

    return false;
};

const resolveSectionedSourceMap = (data, url, sections) => {

    let hasSourceContent = false;
    sections.forEach((item) => {
        // offset: { line: 1, column: 0 },
        // map: { sources, sourcesContent  }

        const map = item.map;

        if (checkSourcesContent(map)) {
            hasSourceContent = true;
            return;
        }

        const done = resolveSourcesContent(map, url);
        if (done) {
            hasSourceContent = true;
        }

    });

    if (hasSourceContent) {
        return flattenSourceMaps(data);
    }
};

const resolveSourceMap = (data, url) => {
    if (!data) {
        return;
    }
    const {
        sections, sources, mappings
    } = data;

    if (sections) {
        return resolveSectionedSourceMap(data, url, sections);
    }

    if (!sources || !mappings) {
        return;
    }

    // check sources content
    if (checkSourcesContent(data)) {
        return data;
    }

    // load sources content by sources
    return resolveSourcesContent(data, url);

};

const getInlineSourceMap = (content) => {
    let smc;
    try {
        smc = convertSourceMap.fromSource(content);
    } catch (e) {
        // ignore "//# sourceMappingURL=" in a string
        // console.log(e);
    }
    return smc;
};

const collectSourceMaps = async (v8list, options) => {

    const sourceList = [];
    const sourcemapList = [];
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
        const { cachePath } = Util.getCacheFileInfo('source', id, options.cacheDir);
        if (fs.existsSync(cachePath)) {
            continue;
        }

        // save source and sourceMap to separated json file
        const sourceData = {
            id,
            url,
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
            const smc = getInlineSourceMap(source);
            if (smc) {
                sourceData.sourceMap = resolveSourceMap(smc.sourcemap, url);
                sourcemapList.push({
                    url,
                    inline: true
                });
                sourceList.push(sourceData);
                continue;
            }
            // from url async
            const sourceMapUrl = getSourceMapUrl(source, item.url);
            if (sourceMapUrl) {
                concurrency.addItem({
                    sourceMapUrl,
                    sourceData
                });
                continue;
            }
        }

        // no need check sourceMap
        sourceList.push(sourceData);

    }

    // from url concurrency
    await concurrency.start(async (item) => {
        const { sourceMapUrl, sourceData } = item;
        const { url } = sourceData;
        const data = await loadSourceMap(sourceMapUrl, options);
        if (data) {
            sourceData.sourceMap = resolveSourceMap(data, url);
            sourcemapList.push({
                url,
                sourceMapUrl
            });
        }

        sourceList.push(sourceData);

    });

    return {
        sourceList,
        sourcemapList
    };

};

module.exports = {
    collectSourceMaps,
    resolveSourceMap
};
