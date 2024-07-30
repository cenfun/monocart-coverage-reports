const EC = require('eight-colors');
const { mergeScriptCovs } = require('@bcoe/v8-coverage');
const Util = require('../utils/util.js');
const { getV8Summary } = require('./v8-summary.js');
const { dedupeFlatRanges } = require('../utils/dedupe.js');
const {
    resolveAnonymousUrl, normalizeSourcePath, getSourcePathReplacer
} = require('../utils/source-path.js');
const { collectSourceMaps } = require('../converter/collect-source-maps.js');
const { minimatch } = require('../packages/monocart-coverage-vendor.js');

const { v8Report } = require('../reports/v8.js');
const { v8JsonReport } = require('../reports/v8-json.js');
const { customReport } = require('../reports/custom.js');

const getWrapperSource = (offset, source) => {
    // NO \n because it break line number in mappings
    let startStr = '';
    if (offset >= 4) {
        // fill comments
        const spaces = ''.padEnd(offset - 4, '*');
        startStr = `/*${spaces}*/`;
    } else {
        // fill spaces (should no chance)
        startStr += ''.padEnd(offset, ' ');
    }
    return startStr + source;
};

const getEntryFilter = (options) => {
    let input = options.entryFilter || options.filter;

    // for function handler
    if (typeof input === 'function') {
        return input;
    }

    // for single minimatch pattern
    if (input && typeof input === 'string') {
        // string to multiple patterns "{...}"
        // mcr npx mocha --entryFilter {'**/node_modules/**':false,'**/src/*.js':true}
        // mcr npx mocha --entryFilter "{'**/node_modules/**': false, '**/src/*.js': true}"
        const obj = Util.strToObj(input);
        if (obj) {
            input = obj;
        } else {
            return (entry) => {
                return minimatch(entry.url, input);
            };
        }
    }

    // for patterns
    if (input && typeof input === 'object') {
        const patterns = Object.keys(input);
        return (entry) => {
            const url = entry.url;
            for (const pattern of patterns) {
                if (minimatch(url, pattern)) {
                    return input[pattern];
                }
            }
            // false if not matched
        };
    }

    // default
    return () => true;
};

const initV8ListAndSourcemap = async (mcr, v8list) => {

    const { options } = mcr;

    // entry filter
    const entryFilter = getEntryFilter(options);

    const lengthBefore = v8list.length;
    v8list = v8list.filter(entryFilter);
    const lengthAfter = v8list.length;
    Util.logFilter('entry filter (add):', lengthBefore, lengthAfter);

    // filter no source or text
    // init type and css source from text
    // keep functions
    v8list = v8list.filter((entry) => {

        // console.log(entry.url);

        if (typeof entry.source === 'string' && entry.functions) {
            entry.type = 'js';
            return true;
        }
        if (typeof entry.text === 'string' && entry.ranges) {
            entry.type = 'css';
            return true;
        }
        // allow empty coverage
        if (entry.empty) {
            if (!['js', 'css'].includes(entry.type)) {
                entry.type = 'js';
            }
            return true;
        }
        // 404 css, text will be empty
        Util.logDebug(EC.red(`Invalid source or coverage data: ${entry.url}`));
        // console.log(entry);
    });

    // onEntry hook
    // after filter but before init, because id depends source and sourcePath
    const onEntry = options.onEntry;
    if (typeof onEntry === 'function') {
        for (const entry of v8list) {
            await onEntry(entry);
        }
    }

    const sourcePathReplacer = getSourcePathReplacer(options);

    const baseDir = options.baseDir;

    // init id, sourcePath
    v8list = v8list.map((entry, i) => {

        // it could be a empty file
        let source = `${entry.source || entry.text || ''}`;

        // fix source with script offset
        let scriptOffset;
        const offset = Util.toNum(entry.scriptOffset, true);
        if (offset > 0) {
            scriptOffset = offset;
            source = getWrapperSource(offset, source);
        }

        const data = {
            url: entry.url,
            type: entry.type,
            source,
            // script offset >= 0, for vm script
            scriptOffset,
            // Manually Resolve the Sourcemap
            sourceMap: entry.sourceMap,
            // fake source with `lineLengths`
            fake: entry.fake,
            // empty coverage
            empty: entry.empty,
            // match source if using empty coverage
            distFile: entry.distFile
        };

        // coverage
        if (data.type === 'js') {
            data.functions = entry.functions;
        } else {
            data.ranges = entry.ranges;
        }

        // resolve source path
        const sourceUrl = resolveAnonymousUrl(data.url, i + 1, data.type);
        let sourcePath = normalizeSourcePath(sourceUrl, baseDir);
        if (sourcePathReplacer) {
            const newSourcePath = sourcePathReplacer(sourcePath, data);
            if (typeof newSourcePath === 'string' && newSourcePath) {
                sourcePath = newSourcePath;
            }
        }
        data.sourcePath = sourcePath;
        // console.log(data.url, sourcePath);

        // calculate source id
        data.id = Util.calculateSha1(sourcePath + data.source);

        return data;
    });

    // collect sourcemap first
    const time_start = Date.now();
    const { sourceList, sourcemapList } = await collectSourceMaps(v8list, options);
    if (sourcemapList.length) {
        // debug level time
        Util.logTime(`loaded sourcemaps: ${sourcemapList.length}`, time_start);
        // console.log(smList);
    }

    // save source list
    for (const sourceData of sourceList) {

        const { cacheName, cachePath } = Util.getCacheFileInfo('source', sourceData.id, options.cacheDir);
        mcr.fileCache.set(cacheName, sourceData);
        await Util.writeFile(cachePath, JSON.stringify(sourceData));

        // save source and sourcemap file for debug
        // https://evanw.github.io/source-map-visualization
        // if (sourceData.sourceMap) {
        //     await Util.writeFile(`${sourcePath}.js`, sourceData.source);
        //     await Util.writeFile(`${sourcePath}.js.map`, JSON.stringify(sourceData.sourceMap));
        // }
    }

    return v8list;
};

// ========================================================================================================

// force to async
const mergeCssRanges = (itemList) => {
    return new Promise((resolve) => {

        let concatRanges = [];
        itemList.forEach((item) => {
            concatRanges = concatRanges.concat(item.ranges);
        });

        // ranges: [ {start, end} ]
        const ranges = dedupeFlatRanges(concatRanges);

        resolve(ranges || []);
    });
};

const mergeJsFunctions = (itemList) => {
    return new Promise((resolve) => {

        const res = mergeScriptCovs(itemList);
        const functions = res && res.functions;

        resolve(functions || []);
    });
};

const mergeV8Coverage = async (dataList, sourceCache, options) => {

    let allList = [];
    dataList.forEach((d) => {
        allList = allList.concat(d.data);
    });

    // remove empty items
    const coverageList = allList.filter((it) => !it.empty);

    // connect all functions and ranges
    const itemMap = {};
    const mergeMap = {};
    coverageList.forEach((item) => {
        const { id } = item;
        const prev = itemMap[id];
        if (prev) {
            if (mergeMap[id]) {
                mergeMap[id].push(item);
            } else {
                mergeMap[id] = [prev, item];
            }
        } else {
            itemMap[id] = item;
        }
    });

    // merge functions and ranges
    const mergeIds = Object.keys(mergeMap);
    for (const id of mergeIds) {
        const itemList = mergeMap[id];
        const item = itemMap[id];
        if (item.type === 'js') {
            item.functions = await mergeJsFunctions(itemList);
        } else {
            item.ranges = await mergeCssRanges(itemList);
        }
    }

    // first time filter for empty, (not for sources)
    // empty and not in item map
    const emptyList = allList.filter((it) => it.empty).filter((it) => !itemMap[it.id]);

    // empty list + merged list
    const mergedList = emptyList.concat(Object.values(itemMap));

    // try to load coverage and source by id
    for (const item of mergedList) {
        const {
            id, type, empty
        } = item;
        const json = sourceCache.get(id);
        if (json) {
            item.source = json.source;
            item.sourceMap = json.sourceMap;
        } else {
            Util.logError(`Not found source data: ${Util.relativePath(item.sourcePath)}`);
            item.source = '';
        }

        // add empty coverage after merged
        if (empty) {
            if (type === 'js') {
                item.functions = [{
                    functionName: '',
                    ranges: [{
                        startOffset: 0,
                        endOffset: item.source.length,
                        count: 0
                    }]
                }];
            } else {
                // empty css
                item.ranges = [];
            }
        }

    }

    return mergedList;
};

// ============================================================

const saveV8Report = async (v8list, options, istanbulReportPath) => {

    const defaultWatermarks = {
        bytes: [50, 80],
        statements: [50, 80],
        branches: [50, 80],
        functions: [50, 80],
        lines: [50, 80]
    };
    const watermarks = Util.resolveWatermarks(defaultWatermarks, options.watermarks);

    const summary = getV8Summary(v8list, watermarks);

    const reportData = {
        type: 'v8',
        // override with saved file path
        reportPath: '',
        version: Util.version,
        name: options.name,
        watermarks,
        summary,
        files: v8list
    };

    // v8 only reports
    const buildInV8Reports = {
        'v8': v8Report,
        'v8-json': v8JsonReport
    };

    const outputs = {};
    const v8Group = options.reportGroup.get('v8');
    // could be no v8 only reports, but have `both` data reports
    if (v8Group) {
        for (const [reportName, reportOptions] of v8Group) {
            const buildInHandler = buildInV8Reports[reportName];
            const t1 = Date.now();
            if (buildInHandler) {
                outputs[reportName] = await buildInHandler(reportData, reportOptions, options);
            } else {
                outputs[reportName] = await customReport(reportName, reportData, reportOptions, options);
            }
            Util.logTime(`┌ [generate] saved report: ${reportName}`, t1);
        }
    }

    if (istanbulReportPath) {
        outputs.istanbul = istanbulReportPath;
    }

    // outputPath, should be html or json
    const reportPath = Util.resolveReportPath(options, () => {
        return outputs.v8 || outputs.istanbul || Object.values(outputs).filter((it) => it && typeof it === 'string').shift();
    });

    const coverageResults = {
        type: 'v8',
        // html or json
        reportPath,
        version: Util.version,
        name: options.name,
        watermarks,
        summary,
        files: v8list
    };

    return coverageResults;
};

module.exports = {
    initV8ListAndSourcemap,
    mergeV8Coverage,
    saveV8Report,
    getEntryFilter
};
