import fs from 'node:fs';
import path from 'node:path';
import EC from 'eight-colors';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Concurrency } from '../platform/concurrency.js';
import convertSourceMap from 'convert-source-map';
import { flattenSourceMaps } from './flatten-source-maps.js';

import { Util } from '../utils/util.js';

const getSourceMapCandidates = (source) => {
    if (!source.includes('sourceMappingURL=')) {
        return [];
    }

    // Match directive-shaped text without parsing JS; valid maps in strings can be selected.
    const candidates = [];
    for (const match of source.matchAll(convertSourceMap.commentRegex)) {
        candidates.push({
            index: match.index,
            comment: match[0],
            inline: true
        });
    }
    for (const match of source.matchAll(convertSourceMap.mapFileCommentRegex)) {
        const filename = match[1] || match[2];
        if (filename && !filename.startsWith('data:')) {
            candidates.push({
                index: match.index,
                filename
            });
        }
    }
    // Like 2.13.0, try inline maps before external ones. Within each kind,
    // start at the last directive and fall back when it is unusable.
    return candidates.sort((a, b) => {
        if (a.inline !== b.inline) {
            return a.inline ? -1 : 1;
        }
        return b.index - a.index;
    });
};

// Only check the fields required to resolve a map; decoding is deferred to
// the downstream converter. A map without sources cannot map to original code.
const isValidBasicMap = (data) => Array.isArray(data.sources)
    && data.sources.every((source) => typeof source === 'string')
    && typeof data.mappings === 'string'
    && (data.sources.length > 0 || data.mappings === '');

const isValidSection = (section) => section && section.offset
    && Number.isInteger(section.offset.line) && section.offset.line >= 0
    && Number.isInteger(section.offset.column) && section.offset.column >= 0
    && isValidSourceMap(section.map);

const isValidSourceMap = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return false;
    }
    if (Array.isArray(data.sections)) {
        return data.sections.every(isValidSection);
    }
    return isValidBasicMap(data);
};

// An empty map cannot map coverage to any original source. Try the next
// candidate instead, including when an indexed map has only empty sections.
const hasMappings = (data) => {
    if (Array.isArray(data.sections)) {
        return data.sections.some((section) => hasMappings(section.map));
    }
    return data.mappings.length > 0;
};

const isUsableSourceMap = (data) => isValidSourceMap(data) && hasMappings(data);

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

const resolveMapUrl = (filename, url) => {
    const urlObj = Util.resolveUrl(filename, url) || Util.resolveUrl(filename, pathToFileURL(url).toString());
    return urlObj?.toString();
};

const resolveSourcesContent = (data, url) => {

    const {
        sources, sourcesContent, sourceRoot
    } = data;
    // sourceRoot is a directory, even when its trailing slash is omitted.
    let rootUrl;
    if (typeof sourceRoot === 'string' && sourceRoot) {
        rootUrl = Util.resolveUrl(sourceRoot.endsWith('/') ? sourceRoot : `${sourceRoot}/`, url);
    }

    // sources [1,2,3]
    // sourcesContent could be [null, null, "content"]
    // some of contents could be missed

    let hasSourceContent = false;
    const missingSources = [];
    sources.forEach((file, i) => {
        if (typeof sourcesContent[i] === 'string') {
            hasSourceContent = true;
            return;
        }

        const sourceUrl = Util.resolveUrl(file, rootUrl?.href || url);
        if (sourceUrl) {
            let content;
            try {
                let sourcePath = sourceUrl.toString();
                // Read actual local paths, not normalized virtual report paths.
                if (sourceUrl.protocol === 'file:') {
                    sourcePath = fileURLToPath(sourceUrl);
                }
                content = Util.readFileSync(path.resolve(sourcePath));
            } catch {
                // A foreign or malformed file URL is just an unavailable source.
                // Keep resolving the other sources instead of discarding the map.
            }
            if (typeof content === 'string') {
                sourcesContent[i] = content;
                hasSourceContent = true;
                return;
            }
        }

        missingSources.push(i);
        Util.logDebug(EC.red(`failed to load source content: ${file}`));

    });


    if (hasSourceContent) {
        // Only commit placeholders for accepted maps. A rejected map may be
        // cached by the resolver and must not look like valid empty sources later.
        missingSources.forEach((i) => {
            sourcesContent[i] = '';
        });
        return data;
    }
};

const checkSourcesContent = (data) => {
    const { sourcesContent, sources } = data;

    if (!Array.isArray(sourcesContent)) {
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

        if (resolveSourceMap(item.map, url)) {
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
    // Optional metadata may be absent or malformed in otherwise usable maps.
    if (!Array.isArray(data.names)) {
        data.names = [];
    }
    const {
        sections, sources, mappings
    } = data;

    if (sections) {
        return resolveSectionedSourceMap(data, url, sections);
    }

    if (!Array.isArray(sources) || typeof mappings !== 'string') {
        return;
    }

    // check sources content
    if (checkSourcesContent(data)) {
        return data;
    }

    // load sources content by sources
    return resolveSourcesContent(data, url);

};

const collectSourceMaps = async (v8list, options) => {

    const sourceList = [];
    const sourcemapList = [];
    const concurrency = new Concurrency();
    for (const item of v8list) {

        const {
            url, id, source, sourceMap
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

        // An explicitly supplied, usable map takes precedence over sourceMappingURL.
        // Keep the original source so V8 offsets remain valid.
        if (!isUsableSourceMap(sourceData.sourceMap)) {
            delete sourceData.sourceMap;
            const candidates = getSourceMapCandidates(source);
            if (candidates.length) {
                concurrency.addItem({
                    candidates,
                    sourceData
                });
            }
        }

        // Keep source entries in input order while maps load concurrently.
        sourceList.push(sourceData);

    }

    await concurrency.start(async (item) => {
        const { candidates, sourceData } = item;
        const { url } = sourceData;
        for (const candidate of candidates) {
            let data;
            let sourceMapUrl = url;
            try {
                if (candidate.inline) {
                    data = convertSourceMap.fromComment(candidate.comment).sourcemap;
                } else {
                    sourceMapUrl = resolveMapUrl(candidate.filename, url);
                    if (!sourceMapUrl) {
                        continue;
                    }
                    data = await loadSourceMap(sourceMapUrl, options);
                }
                if (!isUsableSourceMap(data)) {
                    continue;
                }
                // Inline maps inherit the generated file's URL. External maps
                // resolve their sources relative to the map, not the bundle.
                const sourceMap = resolveSourceMap(data, sourceMapUrl);
                if (!sourceMap) {
                    continue;
                }
                sourceData.sourceMap = sourceMap;
                sourcemapList.push(candidate.inline ? {
                    url,
                    inline: true
                } : {
                    url,
                    sourceMapUrl
                });
                break;
            } catch (e) {
                // Try an earlier sourceMappingURL if parsing or loading fails.
            }
        }
    });

    return {
        sourceList,
        sourcemapList
    };

};

export {
    collectSourceMaps,
    resolveSourceMap
};
