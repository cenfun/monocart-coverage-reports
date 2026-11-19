import fs from 'node:fs';
import path from 'node:path';
import { Util } from '../utils/util.js';
import { calculateSourceCacheId } from '../utils/source-id.js';
import { isTypeScriptFile } from './typescript.js';

import { pathToFileURL, fileURLToPath } from 'node:url';

import {
    normalizeSourcePath, getSourcePathReplacer, getSourceType, cssTypes
} from '../utils/source-path.js';

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
    const hasTransformer = typeof transformer === 'function';
    const fileTransformer = hasTransformer ? transformer : () => {};

    return {
        dirList,
        fileFilter,
        fileTransformer,
        hasTransformer
    };
};

const resolveFileType = (fileType, filePath) => {
    if (fileType === 'js' || fileType === 'css') {
        return fileType;
    }
    return cssTypes.has(getSourceType(filePath)) ? 'css' : 'js';
};

const markTypeScriptContext = (entry, filePath, context) => {
    if (entry.type !== 'js' || entry.sourceMap || !isTypeScriptFile({
        url: filePath
    })) {
        return;
    }
    if (context.transformed) {
        entry.typeScriptTransformed = true;
        return;
    }
    if (context.native) {
        // Association with native execution is not evidence this file loaded.
        entry.nativeTypeScriptContext = true;
    }
};

const saveUntestedFileSource = async (entryFile, options) => {
    const {
        id,
        url,
        source,
        sourceMap
    } = entryFile;
    // console.log('-', entry.sourcePath);

    const cacheId = calculateSourceCacheId(id, sourceMap);
    if (cacheId !== id) {
        entryFile.sourceCacheId = cacheId;
    }
    const { cachePath } = Util.getCacheFileInfo('source', cacheId, options.cacheDir);
    if (fs.existsSync(cachePath)) {
        return;
    }

    // save source and sourceMap to separated json file
    const sourceData = {
        id,
        url,
        source,
        sourceMap,
        sourceCacheId: entryFile.sourceCacheId
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

const resolveUntestedPath = (entry, baseDir, sourcePathReplacer) => {
    const sourcePath = normalizeSourcePath(entry.url, baseDir);
    if (sourcePathReplacer) {
        const replacement = sourcePathReplacer(sourcePath, entry);
        if (typeof replacement === 'string' && replacement) {
            return replacement;
        }
    }
    return sourcePath;
};

const getEmptyCoverages = async (testedMap, options, coverageType, fileList, fileTransformer, typeScriptContext) => {
    const sourceFilter = Util.getSourceFilter(options);
    const sourcePathReplacer = getSourcePathReplacer(options);
    // User callbacks may inspect or mutate entry.source; object replacements cannot.
    const needsSourceForPath = typeof options.sourcePath === 'function';
    const baseDir = options.baseDir;

    // console.log(fileList);

    const entryList = [];
    for (const item of fileList) {

        const { fileType, filePath } = item;
        const type = resolveFileType(fileType, filePath);
        const url = pathToFileURL(filePath).toString();
        const entry = {
            empty: true,
            type,
            url
        };
        if (needsSourceForPath) {
            entry.source = Util.readFileSync(filePath);
        }

        const sourcePath = resolveUntestedPath(entry, baseDir, sourcePathReplacer);

        if (testedMap.has(sourcePath)) {
            continue;
        }

        if (!sourceFilter(sourcePath)) {
            continue;
        }

        if (!needsSourceForPath) {
            entry.source = Util.readFileSync(filePath);
        }
        entry.sourcePath = sourcePath;

        await fileTransformer(entry, coverageType);
        markTypeScriptContext(entry, filePath, typeScriptContext);
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

const getUntestedList = (testedMap, options, coverageType = 'v8', nativeTypeScriptContext = false) => {
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

    // Native TS execution opts into native analysis for untested TS too.
    // Browser/bundler reports and explicit transformers keep their old behavior.
    return getEmptyCoverages(testedMap, options, coverageType, fileList, fileTransformer, {
        native: nativeTypeScriptContext, transformed: allOptions.hasTransformer
    });

};


export { getUntestedList };
