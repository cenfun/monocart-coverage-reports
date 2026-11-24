import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import EC from 'eight-colors';

import { Util } from './utils/util.js';
import { resolveSourceMap } from './converter/collect-source-maps.js';
import { createNativeTypeScriptSourceMap } from './utils/source-map.js';

// ========================================================================================================
// built-in reports

// v8
import { mergeV8Coverage, saveV8Report } from './v8/v8.js';

// both
import { codecovReport } from './reports/codecov.js';
import { codacyReport } from './reports/codacy.js';

import { consoleDetailsReport } from './reports/console-details.js';
import { consoleSummaryReport } from './reports/console-summary.js';

import { markdownDetailsReport } from './reports/markdown-details.js';
import { markdownSummaryReport } from './reports/markdown-summary.js';

import { customReport } from './reports/custom.js';

const allBuiltInReports = {
    // v8
    'v8': 'v8',
    'v8-json': 'v8',

    // istanbul
    'clover': 'istanbul',
    'cobertura': 'istanbul',
    'html': 'istanbul',
    'html-spa': 'istanbul',
    'json': 'istanbul',
    'json-summary': 'istanbul',
    'lcov': 'istanbul',
    'lcovonly': 'istanbul',
    'none': 'istanbul',
    'teamcity': 'istanbul',
    'text': 'istanbul',
    'text-lcov': 'istanbul',
    'text-summary': 'istanbul',

    // both
    'codecov': 'both',
    'codacy': 'both',
    'console-details': 'both',
    'console-summary': 'both',
    'markdown-details': 'both',
    'markdown-summary': 'both',
    'raw': 'both'
};

const bothBuiltInReports = {
    'codecov': codecovReport,
    'codacy': codacyReport,

    'console-details': consoleDetailsReport,
    'console-summary': consoleSummaryReport,

    'markdown-details': markdownDetailsReport,
    'markdown-summary': markdownSummaryReport,

    'raw': async (... args) => {
        const { rawReport } = await import('./reports/raw.js');
        return rawReport(... args);
    }
};

// ========================================================================================================

const getReportGroup = (reports, lcov, dataType) => {

    const reportMap = {};

    const reportList = Util.toList(reports, ',');
    reportList.forEach((it) => {
        if (Util.isList(it)) {
            // ["v8"], ["v8", {}]
            const id = it[0];
            if (typeof id === 'string' && id) {
                reportMap[id] = {
                    ... it[1]
                };
            }
            return;
        }
        if (typeof it === 'string' && it) {
            reportMap[it] = {};
        }
    });

    // using default report if no reports
    if (!Object.keys(reportMap).length) {
        const defaultReport = dataType === 'v8' ? 'v8' : 'html';
        reportMap[defaultReport] = {};
    }

    // add lcovonly report after default report
    if (lcov && !reportMap.lcovonly) {
        reportMap.lcovonly = {};
    }

    // group v8 and istanbul
    const groupMap = new Map();
    Object.keys(reportMap).forEach((k) => {
        const options = reportMap[k];

        let type = allBuiltInReports[k];
        if (!type) {
            // for custom reporter
            type = options.type || 'v8';
        }

        let group = groupMap.get(type);
        if (!group) {
            group = new Map();
            groupMap.set(type, group);
        }

        group.set(k, options);

    });

    // requires a default istanbul report if data is istanbul
    if (dataType === 'istanbul' && !groupMap.has('istanbul')) {
        const istanbulGroup = new Map();
        istanbulGroup.set('html', {});
        groupMap.set('istanbul', istanbulGroup);
    }

    return groupMap;
};

// ========================================================================================================

// maybe v8 or to istanbul reports
const generateV8ListReports = async (v8list, coverageData, fileSources, options) => {
    let istanbulReportPath;
    // v8 to istanbul reports
    if (options.reportGroup.has('istanbul')) {
        const { saveIstanbulReports } = await import('./istanbul/istanbul.js');
        const istanbulCoverageResults = await saveIstanbulReports(coverageData, fileSources, options);
        istanbulReportPath = istanbulCoverageResults.reportPath;
    }

    // v8 reports and v8 coverage results
    // could be no v8 or v8-json, but requires v8 coverage results
    const v8CoverageResults = await saveV8Report(v8list, options, istanbulReportPath);
    return v8CoverageResults;
};

const getCoverageResults = async (dataList, sourceCache, options) => {
    // get first and check v8list or istanbul data
    const firstData = dataList[0];
    const dataType = firstData.type;
    // console.log('data type', dataType);

    // init reports
    options.reportGroup = getReportGroup(options.reports, options.lcov, dataType);
    // console.log('reportGroup', options.reportGroup);

    // v8list
    if (dataType === 'v8') {
        // merge v8list first
        const t1 = Date.now();
        const v8list = await mergeV8Coverage(dataList, sourceCache, options);
        Util.logTime(`${EC.magenta('├')} [generate] merged v8 coverage data`, t1);
        // console.log('after merge', v8list.map((it) => it.url));

        const t2 = Date.now();
        const { convertV8List } = await import('./converter/converter.js');
        const results = await convertV8List(v8list, options, options.reportGroup.has('istanbul'));
        Util.logTime(`${EC.magenta('├')} [generate] converted coverage data`, t2);

        const {
            v8DataList, coverageData, fileSources
        } = results;

        let filteredV8DataList = v8DataList;
        if (options.outputFilter) {
            const outputFilter = Util.createFilterHandler(options.outputFilter, (entry) => entry.sourcePath);
            filteredV8DataList = v8DataList.filter(outputFilter);
            // Keep V8 and converted Istanbul reports in sync.
            const sourcePaths = new Set(filteredV8DataList.map((entry) => entry.sourcePath));
            Object.keys(coverageData).forEach((sourcePath) => {
                if (!sourcePaths.has(sourcePath)) {
                    delete coverageData[sourcePath];
                    delete fileSources[sourcePath];
                }
            });
        }

        return generateV8ListReports(filteredV8DataList, coverageData, fileSources, options);
    }

    // istanbul data
    const t3 = Date.now();
    const { mergeIstanbulCoverage, saveIstanbulReports } = await import('./istanbul/istanbul.js');
    const istanbulData = await mergeIstanbulCoverage(dataList, options);
    Util.logTime(`${EC.magenta('├')} [generate] prepared istanbul coverage data`, t3);
    const fileSources = options.fileSources || {};
    const results = await saveIstanbulReports(istanbulData, fileSources, options);
    return results;
};

const generateCoverageReports = async (dataList, sourceCache, options) => {
    const coverageResults = await getCoverageResults(dataList, sourceCache, options);

    // [ 'type', 'reportPath', 'name', 'watermarks', 'summary', 'files' ]
    // console.log(Object.keys(coverageResults));

    if (options.reportGroup.has('both')) {
        const bothGroup = options.reportGroup.get('both');
        for (const [reportName, reportOptions] of bothGroup) {
            const builtInHandler = bothBuiltInReports[reportName];
            const t1 = Date.now();
            if (builtInHandler) {
                await builtInHandler(coverageResults, reportOptions, options);
            } else {
                await customReport(reportName, coverageResults, reportOptions, options);
            }
            Util.logTime(`${EC.magenta('├')} [generate] saved report: ${reportName}`, t1);
        }
    }

    return coverageResults;
};


// ========================================================================================================

const getInputList = (mcr) => {
    // get input dirs
    const { inputDir, cacheDir } = mcr.options;

    const inputDirs = Util.toList(inputDir, ',');

    const inputList = inputDirs.filter((dir) => {
        const hasDir = fs.existsSync(dir);
        if (!hasDir) {
            // could be empty
            Util.logInfo(`Input coverage not exists: ${Util.relativePath(dir)}`);
        }
        return hasDir;
    });

    if (mcr.hasCache()) {
        inputList.push(cacheDir);
    }

    return inputList;
};

const addJsonData = async (mcr, dataList, sourceCache, input, filename) => {
    const isCoverage = filename.startsWith('coverage-');
    const isSource = filename.startsWith('source-');
    if (isCoverage || isSource) {
        let json = input;
        if (typeof input === 'string') {
            if (mcr.fileCache.has(filename)) {
                json = mcr.fileCache.get(filename);
            } else {
                json = await Util.readJson(path.resolve(input, filename));
            }
        }
        if (json) {
            if (isCoverage) {
                dataList.push(json);
            } else {
                sourceCache.set(json.id, json);
            }
        }
    }
};

const addDirData = async (mcr, dataList, sourceCache, dir) => {
    const allFiles = fs.readdirSync(dir);
    if (!allFiles.length) {
        return;
    }
    for (const filename of allFiles) {
        // only json file
        if (filename.endsWith('.json')) {
            await addJsonData(mcr, dataList, sourceCache, dir, filename);
        }
    }
};

const addZipData = async (mcr, dataList, sourceCache, dir) => {
    const { default: StreamZipModule } = await import('node-stream-zip');
    const StreamZip = StreamZipModule.async;
    const zip = new StreamZip({
        file: dir
    });
    const entries = await zip.entries();
    for (const entry of Object.values(entries)) {
        if (entry.isDirectory) {
            continue;
        }
        const entryName = entry.name;
        const filename = path.basename(entryName);
        // Do not decompress or parse test results (or other unrelated JSON)
        // when merging coverage. Match the cache reader's accepted prefixes.
        if (filename.endsWith('.json') && (filename.startsWith('coverage-') || filename.startsWith('source-'))) {
            const buf = await zip.entryData(entryName);
            const json = JSON.parse(buf.toString('utf-8'));
            await addJsonData(mcr, dataList, sourceCache, json, filename);
        }

    }
    // Do not forget to close the file once you're done
    await zip.close();
};

const getInputData = async (mcr) => {

    const inputList = getInputList(mcr);
    // console.log('input list', inputList);

    const dataList = [];
    const sourceCache = new Map();

    for (const dir of inputList) {

        const info = fs.statSync(dir);
        if (info.isDirectory()) {
            await addDirData(mcr, dataList, sourceCache, dir);
        } else if (info.isFile()) {
            await addZipData(mcr, dataList, sourceCache, dir);
        } else {
            Util.logError(`Invalid input: ${dir}`);
        }

    }

    if (!dataList.length) {
        if (!mcr.options.all) {
            const dirs = inputList.map((dir) => Util.relativePath(dir));
            Util.logError(`Not found coverage data in dir(s): ${dirs.join(', ')}`);
            return;
        }
        // No coverage input: use V8 so `all` can add untested files.
        dataList.push({
            type: 'v8', data: []
        });
    }

    return {
        dataList,
        sourceCache
    };
};

// ========================================================================================================

const matchCapturedSources = (candidates, execution) => {
    if (candidates.length <= 1 || !execution) {
        return candidates;
    }
    const matches = [];
    // Latest eligible process start time (Unix epoch milliseconds).
    let latestTimestamp = -Infinity;
    candidates.forEach((item) => {
        const captured = item.execution;
        // captured.timestamp: process start; execution.timestamp: snapshot write (Unix epoch milliseconds).
        if (!captured || captured.processId !== execution.processId || captured.threadId !== execution.threadId || captured.timestamp > execution.timestamp) {
            return;
        }
        // Reject other PIDs first; retain only the latest matching execution.
        if (captured.timestamp > latestTimestamp) {
            matches.length = 0;
            latestTimestamp = captured.timestamp;
        }
        if (captured.timestamp === latestTimestamp) {
            matches.push(item);
        }
    });
    if (matches.length) {
        return matches;
    }
    const legacy = candidates.filter((item) => !item.execution);
    return legacy.length ? legacy : candidates;
};

const getCapturedSource = (sourceCache, url, execution) => {
    const candidates = sourceCache.get(url);
    if (!candidates) {
        return;
    }
    if (candidates.length <= 1) {
        // A lone capture takes precedence, even without an execution match.
        // If another run uses a different loader at the same URL and does not
        // capture its source, keep those runs in separate coverage directories.
        return candidates[0];
    }
    // Matching ties and incomplete metadata use the first candidate in stable
    // source-filename order, so an existing URL always resolves to one source.
    return matchCapturedSources(candidates, execution)[0];
};

// Keep normalization tied to the exact parsed capture, not its URL or stripped
// JS. Weak keys allow these results to be collected after the import finishes.
const nativeTypeScriptSourceCache = new WeakMap();
const getNativeTypeScriptSource = (sourceData) => {
    let normalized = nativeTypeScriptSourceCache.get(sourceData);
    if (!normalized) {
        const source = stripTypeScriptTypes(sourceData.source, {
            mode: 'strip'
        });
        normalized = {
            source,
            sourceMap: createNativeTypeScriptSourceMap(sourceData.url, sourceData.source, source)
        };
        nativeTypeScriptSourceCache.set(sourceData, normalized);
    }
    return normalized;
};

const resolveEntrySource = (entry, sourceMapCache, sourceCache, execution) => {

    const url = entry.url;

    // source from `source-id.json`
    const sourceData = getCapturedSource(sourceCache, url, execution);
    if (sourceData) {
        if (sourceData.nativeTypeScript) {
            // Normalize only at ingestion. Raw MCR data keeps JS plus this map,
            // so regeneration does not strip again or read a newer disk source.
            const { source, sourceMap } = getNativeTypeScriptSource(sourceData);
            entry.source = source;
            // Strings are immutable; copy the map object and all mutable arrays
            // so onEntry hooks cannot change the template or another snapshot.
            entry.sourceMap = {
                ... sourceMap,
                sources: sourceMap.sources.slice(),
                sourcesContent: sourceMap.sourcesContent.slice(),
                names: sourceMap.names.slice()
            };
            entry.nativeTypeScript = true;
        } else {
            entry.source = sourceData.source;
        }
        return;
    }

    // source for typescript file from source map cache
    // Note: no runtime code but lineLengths
    const tsExtensionsPattern = /\.([cm]?ts|[tj]sx)($|\?)/;
    if (tsExtensionsPattern.test(url)) {
        const sourcemapData = sourceMapCache[url];
        const lineLengths = sourcemapData && sourcemapData.lineLengths;

        // for fake source file (can not parse to AST)
        if (lineLengths) {
            let fakeSource = '';
            sourcemapData.lineLengths.forEach((length) => {
                fakeSource += `${''.padEnd(length, '*')}\n`;
            });
            entry.fake = true;
            entry.source = fakeSource;
            return;
        }

    }

    // Note: it could be jsx format even extname is `.js`
    const filePath = fileURLToPath(url);
    if (fs.existsSync(filePath)) {
        entry.source = fs.readFileSync(filePath).toString('utf8');
    }

};

const resolveEntrySourceMap = (entry, sourceMapCache) => {
    // Keep the synthetic map, not maps/comments describing the original TS.
    if (entry.nativeTypeScript) {
        return;
    }
    // sourcemap data
    const sourcemapData = sourceMapCache[entry.url];
    if (sourcemapData) {
        if (sourcemapData.data) {
            entry.sourceMap = resolveSourceMap(sourcemapData.data, entry.url);
        }
    }
};

const readCoverageData = async (dir, filename, entryFilter, sourceCache) => {

    const content = await Util.readFile(path.resolve(dir, filename));
    if (!content) {
        return;
    }
    const json = JSON.parse(content);
    if (!json) {
        return;
    }

    // raw v8 json
    let coverageData = json.result;
    if (!Util.isList(coverageData)) {
        return;
    }

    const match = (/^coverage-(\d+)-(\d+)-(\d+)\.json$/).exec(filename);
    const execution = match && {
        processId: Number(match[1]),
        // Coverage snapshot write time (Unix epoch milliseconds).
        timestamp: Number(match[2]),
        threadId: Number(match[3])
    };

    // filter node internal files, should no anonymous for nodejs
    coverageData = coverageData.filter((entry) => {
        if (!entry.url) {
            return false;
        }
        if (entry.url.startsWith('file:')) {
            return true;
        }
        // Node 22 may report require-loaded .cts with a native absolute path.
        // Only accept it when the capture hook confirms this exact native TS file.
        if (path.isAbsolute(entry.url)) {
            const url = pathToFileURL(entry.url).href;
            const candidates = sourceCache.get(url);
            if (candidates && matchCapturedSources(candidates, execution).some((item) => item.nativeTypeScript)) {
                entry.url = url;
                return true;
            }
        }
        return false;
    });

    const lengthBefore = coverageData.length;
    coverageData = coverageData.filter(entryFilter);
    const lengthAfter = coverageData.length;
    Util.logFilter('entry filter (addFromDir):', lengthBefore, lengthAfter);

    if (!Util.isList(coverageData)) {
        // Util.logDebug('No coverage data after filter');
        return;
    }

    const sourceMapCache = json['source-map-cache'] || {};
    for (const entry of coverageData) {
        resolveEntrySource(entry, sourceMapCache, sourceCache, execution);
        resolveEntrySourceMap(entry, sourceMapCache);
    }

    return coverageData;
};

const readSourceList = async (dir, sourceList) => {
    const sourceCache = new Map();

    // Keep the first-source fallback deterministic across filesystems.
    for (const filename of sourceList.sort()) {
        const content = await Util.readFile(path.resolve(dir, filename));
        if (!content) {
            continue;
        }
        const json = JSON.parse(content);
        if (!json) {
            continue;
        }
        if (json.url) {
            const candidates = sourceCache.get(json.url) || [];
            candidates.push(json);
            sourceCache.set(json.url, candidates);
        }
    }

    return sourceCache;
};

const readFromDir = async (mcr, dir) => {

    if (!dir || !fs.existsSync(dir)) {
        Util.logInfo(`Not found V8 coverage dir: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    const coverageList = [];
    const sourceList = [];

    files.forEach((filename) => {
        // read all json files
        if (filename.endsWith('.json')) {
            // could be source files generated by register hooks
            if (filename.startsWith('source-')) {
                sourceList.push(filename);
            } else {
                coverageList.push(filename);
            }
        }
    });

    if (!coverageList.length) {
        Util.logInfo(`No coverage files in the dir: ${dir}`);
        return;
    }

    const sourceCache = await readSourceList(dir, sourceList);

    const entryFilter = mcr.getEntryFilter();

    for (const filename of coverageList) {
        const coverageData = await readCoverageData(dir, filename, entryFilter, sourceCache);
        if (coverageData) {
            await mcr.add(coverageData);
        }
    }

    // GC
    sourceCache.clear();

};

export {
    getInputData,
    readFromDir,
    generateCoverageReports
};
