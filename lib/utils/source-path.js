const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const Util = require('./util.js');

const resolveUrl = (input) => {
    let url;
    try {
        url = new URL(input);
    } catch (e) {
        // console.error('error url', input);
        return;
    }
    return url;
};

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

    if (!url) {
        // anonymous scripts will have __playwright_evaluation_script__ as their URL.
        url = pathToFileURL(['anonymous', index ? `-${index}` : '', type ? `.${type}` : ''].join('')).toString();
    }

    // url could be a absolute path
    if (path.isAbsolute(url)) {
        url = pathToFileURL(url).toString();
    }

    if (url.startsWith('file:')) {
        const relPath = Util.relativePath(fileURLToPath(url));
        return filterPath(relPath);
    }

    const urlObj = resolveUrl(url);
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

    return filterPath(url);
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

const initIstanbulSourcePath = (coverageData, fileSources, sourcePathHandler) => {
    if (typeof sourcePathHandler !== 'function') {
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
        if (typeof sourcePathHandler === 'function') {
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
    initIstanbulSourcePath,
    initSourceMapSourcePath
};
