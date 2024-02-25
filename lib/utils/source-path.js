const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const Util = require('./util.js');

const filterPath = (str) => {
    str = decodeURI(str);
    // remove / of start, end or double, ./ ../
    const ls = str.split('/').map((it) => {
        it = it.trim();
        // remove illegal characters except /
        it = it.replace(/[\\:*?"<>|]/g, '');
        // space
        it = it.replace(/\s+/g, '-');
        return it;
    }).filter((item) => {
        if (!item || item === '.' || item === '..') {
            return false;
        }
        return true;
    });
    return ls.join('/');
};

const getSourcePath = (url, index = '', type = '') => {

    // no url for anonymous
    if (!url) {
        // anonymous scripts will have __playwright_evaluation_script__ as their URL.
        url = ['anonymous', index ? `-${index}` : '', type ? `.${type}` : ''].join('');
        return filterPath(url);
    }

    // already is file url
    if (url.startsWith('file:')) {
        const relPath = Util.relativePath(fileURLToPath(url));
        return filterPath(relPath);
    }

    // http/https url, other url
    const urlObj = Util.resolveUrl(url);
    if (urlObj) {
        const host = [urlObj.hostname, urlObj.port].filter((it) => it).join('-');
        // always start with '/'
        const pathname = urlObj.pathname;

        let p = host + pathname;
        // webpack://monocart-v8/packages/v8/src/app.vue?5cc4
        if (urlObj.search) {
            p += `/${urlObj.search}`;
        }

        return filterPath(p);
    }

    // could be path
    const fileUrl = pathToFileURL(url).toString();
    const relPath = Util.relativePath(fileURLToPath(fileUrl));
    return filterPath(relPath);

};

const getSourceType = (sourcePath) => {
    let ext = path.extname(sourcePath);
    let type = 'js';
    if (ext) {
        ext = ext.slice(1);
        const reg = /^[a-z0-9]+$/;
        if (reg.test(ext)) {
            type = ext;
        }
    }
    return type;
};


// ========================================================================================================

const getSourcePathHandler = (options) => {
    const input = options.sourcePath;
    if (typeof input === 'function') {
        return input;
    }
    // object replace key with value
    if (input && typeof input === 'object') {
        const keys = Object.keys(input).filter((k) => typeof input[k] === 'string');
        if (keys.length) {
            return (filePath) => {
                keys.forEach((k) => {
                    filePath = filePath.replace(k, input[k]);
                });
                return filePath;
            };
        }
    }
};

// ========================================================================================================

const initIstanbulSourcePath = (coverageData, fileSources, sourcePathHandler) => {
    if (!sourcePathHandler) {
        return coverageData;
    }

    const newCoverage = {};
    Object.keys(coverageData).forEach((sourcePath) => {
        // previous coverage and source
        const item = coverageData[sourcePath];
        const source = fileSources[sourcePath];

        // new source path, second is source url
        const newSourcePath = sourcePathHandler(sourcePath, '');
        if (typeof newSourcePath === 'string' && newSourcePath) {
            sourcePath = newSourcePath;
        }

        // update source path
        item.data.path = sourcePath;
        newCoverage[sourcePath] = item;
        // update source for the new path
        if (source) {
            fileSources[sourcePath] = source;
        }
    });

    return newCoverage;
};

// ========================================================================================================

const mergeSourceRoot = (sourceRoot, sourceName) => {
    if (sourceName.startsWith(sourceRoot)) {
        return sourceName;
    }
    return sourceRoot + sourceName;
};

const initSourceMapSourcePath = (sourceMap, fileUrls, sourcePathHandler) => {
    // reset sourceRoot
    const sourceRoot = sourceMap.sourceRoot || '';
    sourceMap.sourceRoot = '';

    sourceMap.sources = sourceMap.sources.map((sourceName, i) => {
        const sourceUrl = mergeSourceRoot(sourceRoot, sourceName);

        let sourcePath = getSourcePath(sourceUrl, i + 1);
        if (sourcePathHandler) {
            const newSourcePath = sourcePathHandler(sourcePath, sourceUrl);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }

        fileUrls[sourcePath] = sourceUrl;
        return sourcePath;
    });

};

module.exports = {
    getSourcePath,
    getSourceType,
    getSourcePathHandler,
    initIstanbulSourcePath,
    initSourceMapSourcePath
};
