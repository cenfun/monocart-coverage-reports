const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const Util = require('./util.js');

const resolveSourceRootUrl = (sourceName, sourceRoot) => {
    // prepend sourceRoot
    if (sourceRoot && !sourceName.startsWith(sourceRoot)) {
        if (!sourceRoot.endsWith('/')) {
            sourceRoot += '/';
        }
        return sourceRoot + sourceName;
    }
    return sourceName;
};

const resolveAnonymousUrl = (url, index, type) => {
    if (url) {
        return url;
    }
    // anonymous scripts will have __playwright_evaluation_script__ as their URL.
    const list = ['anonymous'];
    if (index) {
        list.push(`-${index}`);
    }
    if (type) {
        list.push(`.${type}`);
    }
    return list.join('');
};

const normalizePathDir = (sourcePath) => {

    // decodeURI("%20") to space
    let str = decodeURI(`${sourcePath}`);
    str = str.replace(/\\/g, '/');

    // remove / of start, end or double, ./ ../
    return str.split('/').map((it) => {
        it = it.trim();
        // remove illegal characters except /
        it = it.replace(/[\\:*?"<>|]/g, '');
        // keep space
        // it = it.replace(/\s+/g, '-');
        return it;
    }).filter((item) => {
        if (!item || item === '.' || item === '..') {
            return false;
        }
        return true;
    }).join('/');
};

const betterFileURLToPath = (url) => {
    try {
        url = fileURLToPath(url);
    } catch (e) {
        url = decodeURIComponent(url);
        url = fileURLToPath(url);
    }
    return url;
};

const normalizeSourcePath = (sourceUrl, baseDir) => {

    // includes anonymous and everything

    // file url
    if (sourceUrl.startsWith('file:')) {
        const relPath = Util.relativePath(betterFileURLToPath(sourceUrl), baseDir);
        return normalizePathDir(relPath);
    }

    // absolute path
    // c:\\workspace\test\\selenium.spec.js true
    // c://a.js true
    // c:\\a.js true
    // C:/a.js true
    // /a.js true

    // a.js false
    // ws://a.js false
    // file://a.js false
    // http://a.com/a.js false
    // webpack://src/a.js false

    if (path.isAbsolute(sourceUrl)) {
        const relPath = Util.relativePath(sourceUrl, baseDir);
        return normalizePathDir(relPath);
    }

    // ws://a.js
    // http://127.0.0:8080/a.js
    // https://127.0.0:8080/a.js?v=1
    // webpack://coverage-v8/./test/mock/src/branch/branch.js
    // webpack://monocart-v8/../starfall-cli/node_modules/css-loader/dist/runtime/api.js

    // url http/https/webpack
    const urlObj = Util.resolveUrl(sourceUrl);
    if (urlObj) {
        let host = urlObj.host;
        // remove : before port, : can not be a part of dir
        host = host.replace(':', '-');

        // always start with '/'
        const pathname = urlObj.pathname;

        let p = host + pathname;
        // webpack://monocart-v8/packages/v8/src/app.vue?5cc4
        if (urlObj.search) {
            p += `-${urlObj.search}`;
        }

        return normalizePathDir(p);
    }

    // relative path
    const fileUrl = pathToFileURL(sourceUrl).toString();
    const relPath = Util.relativePath(betterFileURLToPath(fileUrl), baseDir);
    return normalizePathDir(relPath);
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

const getSourcePathReplacer = (options) => {
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

const initIstanbulSourcePath = (coverageData, fileSources, options) => {

    const sourcePathReplacer = getSourcePathReplacer(options);

    const newCoverage = {};
    // eslint-disable-next-line complexity
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

        if (!fs.existsSync(sourcePath)) {
            sourcePath = normalizePathDir(sourcePath);
        }

        // new source path, second is source url
        if (sourcePathReplacer) {
            const newSourcePath = sourcePathReplacer(sourcePath, item);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }

        // update source path
        if (item.data) {
            item.data.path = sourcePath;
        } else {
            // from v8
            item.path = sourcePath;
        }

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

const initSourceMapSourcesPath = (fileUrls, sourceMap, distFile, options) => {

    const baseDir = options.baseDir;
    const sourcePathReplacer = getSourcePathReplacer(options);

    sourceMap.sources = sourceMap.sources.map((sourceName, i) => {

        let sourceUrl = resolveSourceRootUrl(sourceName, sourceMap.sourceRoot);
        sourceUrl = resolveAnonymousUrl(sourceUrl, i + 1, 'js');
        let sourcePath = normalizeSourcePath(sourceUrl, baseDir);
        // console.log(sourceUrl, sourcePath);

        if (sourcePathReplacer) {
            // sourcePath could be a filename only, may using distFile to get full path
            const newSourcePath = sourcePathReplacer(sourcePath, {
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
    resolveAnonymousUrl,
    normalizeSourcePath,
    getSourceType,
    getSourcePathReplacer,
    initIstanbulSourcePath,
    initSourceMapSourcesPath
};
