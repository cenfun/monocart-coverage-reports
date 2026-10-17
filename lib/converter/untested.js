import fs from 'node:fs';
import path from 'node:path';
import { Util } from '../utils/util.js';

import { pathToFileURL, fileURLToPath } from 'node:url';

import { normalizeSourcePath, getSourcePathReplacer } from '../utils/source-path.js';

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

const resolveAllFilter = (input) => Util.createFilterHandler(input, (filePath) => filePath);

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

    // console.log('save untested file', id, url);

    await Util.saveSourceCacheFile(sourceData, options);

};

const getUntestedCoverageData = async (entryList, options, coverageType) => {

    // save all empty coverage, 20 - 5(empty)
    const dataId = Util.uid(15, 'empty');
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
    for (const entry of entryList) {

        // for raw report: source file
        // id, url, source, sourceMap
        await saveUntestedFileSource(entry, options);

        if (coverageType === 'istanbul') {

            // ===============================================
            const item = {
                path: fileURLToPath(entry.url),
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
            Util.setEmptyV8Coverage(entry);

            const item = {
                ... entry
            };
            delete item.source;
            delete item.sourceMap;

            // array
            results.data.push(item);
            // will be parsed to AST and converted to V8 coverage
            emptyCoverageList.push(entry);

        }

    }

    // for raw report: coverage file
    const { cachePath } = Util.getCacheFileInfo('coverage', dataId, options.cacheDir);
    await Util.writeFile(cachePath, JSON.stringify(results));

    return emptyCoverageList;
};

const getEmptyCoverages = async (testedMap, options, coverageType, fileList, fileTransformer) => {
    const sourceFilter = Util.getSourceFilter(options);
    const sourcePathReplacer = getSourcePathReplacer(options);
    const baseDir = options.baseDir;

    // console.log(fileList);

    const entryList = [];
    for (const item of fileList) {

        const { fileType, filePath } = item;
        const type = resolveFileType(fileType, filePath);
        const url = pathToFileURL(filePath).toString();
        const source = Util.readFileSync(filePath);
        const entry = {
            empty: true,
            type,
            url,
            source
        };

        // normalize sourcePath here
        let sourcePath = normalizeSourcePath(url, baseDir);
        if (sourcePathReplacer) {
            const newSourcePath = sourcePathReplacer(sourcePath, entry);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }

        // console.log(sourcePath);

        if (testedMap.has(sourcePath)) {
            continue;
        }

        if (!sourceFilter(sourcePath)) {
            continue;
        }

        entry.sourcePath = sourcePath;

        await fileTransformer(entry, coverageType);
        // after transformer
        entry.id = Util.calculateSha1(entry.sourcePath + entry.source);

        entryList.push(entry);
    }


    // console.log('fileList', fileList);
    if (!entryList.length) {
        return;
    }


    // save empty coverage for merging raw reports
    return getUntestedCoverageData(entryList, options, coverageType);
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

    const fileList = [];
    dirList.forEach((dir) => {
        Util.forEachFile(dir, [], (fileName, fileDir) => {
            const filePath = path.resolve(fileDir, fileName);
            // return file extname for file type
            const fileType = fileFilter(filePath);
            if (fileType) {
                fileList.push({
                    filePath,
                    fileType,
                    fileDir,
                    fileName
                });
            }

        });
    });

    if (!fileList.length) {
        return;
    }

    return getEmptyCoverages(testedMap, options, coverageType, fileList, fileTransformer);

};


export { getUntestedList };
