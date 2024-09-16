const fs = require('fs');
const path = require('path');
const Util = require('../utils/util.js');

const { pathToFileURL, fileURLToPath } = require('url');

// const EC = require('eight-colors');
const { minimatch, convertSourceMap } = require('../packages/monocart-coverage-vendor.js');

// ========================================================================================================

const resolveAllDirList = (input) => {
    const dirs = Util.toList(input, ',');
    if (!dirs.length) {
        return;
    }
    const dirList = dirs.filter((it) => fs.existsSync(it));
    if (!dirList.length) {
        return;
    }
    return dirList;
};

const resolveAllFilter = (input) => {
    // for function handler
    if (typeof input === 'function') {
        return input;
    }

    // for single minimatch pattern
    if (input && typeof input === 'string') {
        // string to multiple patterns "{...}"
        const obj = Util.strToObj(input);
        if (obj) {
            input = obj;
        } else {
            return (filePath) => {
                return minimatch(filePath, input);
            };
        }
    }

    // for patterns
    if (input && typeof input === 'object') {
        const patterns = Object.keys(input);
        return (filePath) => {
            for (const pattern of patterns) {
                if (minimatch(filePath, pattern)) {
                    return input[pattern];
                }
            }
            // false if not matched
        };
    }

    // default
    return () => true;
};

const resolveAllOptions = (input) => {
    if (!input) {
        return;
    }

    let dir;
    let filter;
    let transformer;

    if (typeof input === 'string') {
        const obj = Util.strToObj(input);
        if (obj) {
            dir = obj.dir;
            filter = obj.filter;
            transformer = obj.transformer;
        } else {
            dir = input;
        }
    } else if (Array.isArray(input)) {
        dir = input;
    } else {
        dir = input.dir;
        filter = input.filter;
        transformer = input.transformer;
    }

    const dirList = resolveAllDirList(dir);
    if (!dirList) {
        return;
    }

    const fileFilter = resolveAllFilter(filter);
    const fileTransformer = typeof transformer === 'function' ? transformer : () => {};

    return {
        dirList,
        fileFilter,
        fileTransformer
    };
};

const resolveFileType = (fileType, filePath) => {
    if (fileType === 'js' || fileType === 'css') {
        return fileType;
    }
    const extname = path.extname(filePath);
    if (['.css', '.scss', '.sass', '.less'].includes(extname)) {
        return 'css';
    }
    return 'js';
};

const saveUntestedFileSource = async (entryFile, options) => {
    const {
        id,
        url,
        source,
        sourceMap
    } = entryFile;
    // console.log('-', entry.sourcePath);

    const { cachePath } = Util.getCacheFileInfo('source', id, options.cacheDir);
    if (fs.existsSync(cachePath)) {
        return;
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

    // console.log('save untested file', id, url);

    await Util.saveSourceCacheFile(sourceData, options);

};

const getUntestedCoverageData = async (emptyList, options, coverageType) => {

    // save all empty coverage
    const dataId = Util.uid();
    const results = {
        id: dataId
    };

    if (coverageType === 'istanbul') {
        results.type = 'istanbul';
        results.data = {};
    } else {
        results.type = 'v8';
        results.data = [];
    }

    const emptyCoverageList = [];

    // save all empty source and sourcemap
    for (const entryFile of emptyList) {

        // for raw report: source file
        await saveUntestedFileSource(entryFile, options);

        const { type, url } = entryFile;

        if (coverageType === 'istanbul') {

            // ===============================================
            const item = {
                path: fileURLToPath(url),
                statementMap: {},
                fnMap: {},
                branchMap: {},
                s: {},
                f: {},
                b: {}
            };
            // object
            results.data[item.path] = item;
            emptyCoverageList.push(item);

        } else {

            // ===============================================
            if (type === 'js') {
                // empty js
                entryFile.functions = entryFile.functions || [{
                    functionName: '',
                    ranges: [{
                        startOffset: 0,
                        endOffset: entryFile.source.length,
                        count: 0
                    }]
                }];
            } else {
                // empty css
                entryFile.ranges = entryFile.ranges || [];
            }

            const item = {
                ... entryFile
            };
            delete item.source;
            delete item.sourceMap;

            // array
            results.data.push(item);
            // will be parsed to AST and converted to V8 coverage
            emptyCoverageList.push(entryFile);

        }

    }

    // for raw report: coverage file
    const { cachePath } = Util.getCacheFileInfo('coverage', dataId, options.cacheDir);
    await Util.writeFile(cachePath, JSON.stringify(results));

    return emptyCoverageList;
};

const getEmptyCoverages = async (fileList, options, coverageType, fileTransformer) => {

    const emptyList = [];

    for (const item of fileList) {
        const {
            filePath, fileType, sourcePath
        } = item;
        const type = resolveFileType(fileType, filePath);
        const url = pathToFileURL(filePath).toString();
        const source = Util.readFileSync(filePath);
        const entryFile = {
            empty: true,
            type,
            url,
            sourcePath,
            // for empty, css supports both source and text
            source
        };

        await fileTransformer(entryFile, coverageType);

        // after transformer
        entryFile.id = Util.calculateSha1(entryFile.sourcePath + entryFile.source);

        emptyList.push(entryFile);
    }

    // save empty coverage for merging raw reports
    return getUntestedCoverageData(emptyList, options, coverageType);
};

const getUntestedList = (testedMap, options, coverageType = 'v8') => {
    const allOptions = resolveAllOptions(options.all);
    // console.log('allOptions', all, allOptions);
    if (!allOptions) {
        return;
    }
    const {
        dirList, fileFilter, fileTransformer
    } = allOptions;

    const sourceFilter = Util.getSourceFilter(options);

    const fileList = [];
    dirList.forEach((dir) => {
        Util.forEachFile(dir, [], (fileName, fileDir) => {
            const filePath = path.resolve(fileDir, fileName);
            // return file extname for file type
            const fileType = fileFilter(filePath);
            if (!fileType) {
                return;
            }

            const sourcePath = Util.relativePath(filePath);

            // normalize sourcePath here

            if (testedMap.has(sourcePath)) {
                return;
            }

            if (!sourceFilter(sourcePath)) {
                return;
            }

            fileList.push({
                filePath,
                fileType,
                sourcePath
            });
        });
    });
    // console.log('fileList', fileList);
    if (!fileList.length) {
        return;
    }

    return getEmptyCoverages(fileList, options, coverageType, fileTransformer);

};


module.exports = {
    getUntestedList
};
