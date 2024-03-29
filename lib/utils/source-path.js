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

    // console.log(fileSources);

    const newCoverage = {};
    Object.keys(coverageData).forEach((sourcePath) => {
        // previous coverage and source
        const item = coverageData[sourcePath];
        let source = fileSources[sourcePath];

        // source could be empty string ''
        if (typeof source !== 'string') {
            // read source with original source path first
            source = Util.readFileSync(sourcePath);
            if (typeof source === 'string') {
                fileSources[sourcePath] = source;
            }
        }

        // new source path, second is source url
        const newSourcePath = sourcePathHandler(sourcePath, item);
        if (typeof newSourcePath === 'string' && newSourcePath) {
            sourcePath = newSourcePath;
        }

        // update source path
        item.data.path = sourcePath;
        newCoverage[sourcePath] = item;
        // update source for the new path
        if (typeof source === 'string') {
            fileSources[sourcePath] = source;
        }
    });

    // console.log(Object.keys(fileSources));
    // console.log(newCoverage);

    return newCoverage;
};

// ========================================================================================================

const resolveSourceUrl = (sourceName, sourceRoot) => {

    // prepend sourceRoot
    if (sourceRoot && !sourceName.startsWith(sourceRoot)) {
        if (!sourceRoot.endsWith('/')) {
            sourceRoot += '/';
        }
        sourceName = sourceRoot + sourceName;
    }

    // could be absolute path
    // c:\\workspace\test\\selenium.spec.js
    // a.js false
    // c://a.js true
    // ws://a.js false

    if (path.isAbsolute(sourceName)) {
        return pathToFileURL(sourceName).toString();
    }

    // webpack://coverage-v8/./test/mock/src/branch/branch.js
    // webpack://monocart-v8/../starfall-cli/node_modules/css-loader/dist/runtime/api.js

    // as url
    const urlObj = Util.resolveUrl(sourceName);
    if (urlObj) {
        return urlObj.toString();
    }

    // console.log('sourceName', sourceName);

    // as relative path
    const sourceUrl = pathToFileURL(sourceName).toString();

    // console.log('sourceUrl', sourceUrl);

    return sourceUrl;
};

const initSourceMapSourcePath = (sourceMap, fileUrls, distFile, sourcePathHandler) => {

    sourceMap.sources = sourceMap.sources.map((sourceName, i) => {

        const sourceUrl = resolveSourceUrl(sourceName, sourceMap.sourceRoot);

        let sourcePath = getSourcePath(sourceUrl, i + 1);
        if (sourcePathHandler) {
            // sourcePath could be a filename only, may using distFile to get full path
            const newSourcePath = sourcePathHandler(sourcePath, {
                url: sourceUrl,
                distFile
            });
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }

        fileUrls[sourcePath] = sourceUrl;
        return sourcePath;
    });

};

module.exports = {
    // for unit test
    resolveSourceUrl,

    getSourcePath,
    getSourceType,
    getSourcePathHandler,
    initIstanbulSourcePath,
    initSourceMapSourcePath
};
