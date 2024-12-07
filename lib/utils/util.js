const fs = require('fs');
const { writeFile, readFile } = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const EC = require('eight-colors');
const CG = require('console-grid');
const acornWalk = require('acorn-walk');

const Share = require('../platform/share.js');
const request = require('./request.js');
const version = require('../../package.json').version;
const markdownGrid = require('./markdown.js');
const { mergeV8Coverage } = require('./merge/merge.js');
const gc = require('./gc.js');

const {
    findUpSync, supportsColor, minimatch
} = require('../packages/monocart-coverage-vendor.js');

// https://github.com/chalk/supports-color
// disabled color if Terminal stdout does not support color
if (!supportsColor.stdout) {
    EC.disabled = true;
}

const Util = {
    version,

    ... Share,

    EC,
    CG,

    root: process.cwd(),

    request,
    markdownGrid,
    mergeV8Coverage,

    forceGC: () => {
        gc();
    },

    relativePath: function(p, root) {
        p = `${p}`;
        root = `${root || Util.root}`;
        let rp = path.relative(root, p);
        rp = Util.formatPath(rp);
        return rp;
    },

    replace: function(str, obj, defaultValue) {
        str = `${str}`;
        if (!obj) {
            return str;
        }
        str = str.replace(/\{([^}{]+)\}/g, function(match, key) {
            if (!Util.hasOwn(obj, key)) {
                if (typeof (defaultValue) !== 'undefined') {
                    return defaultValue;
                }
                return match;
            }
            let val = obj[key];
            if (typeof (val) === 'function') {
                val = val(obj, key);
            }
            if (typeof (val) === 'undefined') {
                val = '';
            }
            return val;
        });
        return str;
    },

    strToObj: (str) => {
        if (typeof str === 'string') {
            str = str.trim();
            if (str.startsWith('{') && str.endsWith('}')) {
                let fun;
                let err;
                try {
                    fun = new Function(`return ${str}`);
                } catch (e) {
                    err = e;
                }
                if (!err) {
                    const obj = fun();
                    if (obj && typeof obj === 'object') {
                        return obj;
                    }
                }
            }
        }
    },

    calculateSha1: (buffer) => {
        const hash = crypto.createHash('sha1');
        hash.update(buffer);
        return hash.digest('hex');
    },

    checkCoverageData: (data) => {
        if (!data) {
            return false;
        }
        if (Array.isArray(data) && data.length) {
            return true;
        }
        if (Object.keys(data).length) {
            return true;
        }
        return false;
    },

    resolveUrl: (input, base) => {
        let url;
        let err;
        try {
            url = new URL(input, base);
        } catch (e) {
            err = e;
        }
        if (err) {
            // console.error('error url', input);
            return;
        }
        return url;
    },

    resolveWatermarks: (defaultWatermarks, watermarks) => {
        if (watermarks) {
            if (Array.isArray(watermarks)) {
                Object.keys(defaultWatermarks).forEach((k) => {
                    defaultWatermarks[k] = watermarks;
                });
            } else {
                Object.assign(defaultWatermarks, watermarks);
            }
        }
        return defaultWatermarks;
    },

    resolveReportPath: (options, htmlPathHandler) => {

        let reportPath = options.reportPath;
        if (typeof reportPath === 'function') {
            reportPath = reportPath();
        }

        if (typeof reportPath === 'string') {
            if (reportPath) {
                const p = path.resolve(options.outputDir, reportPath);
                return Util.relativePath(p);
            }
            // empty
            return reportPath;
        }
        // using default html path as report path
        return htmlPathHandler();
    },

    getCacheFileInfo: (type, id, cacheDir) => {
        const cacheName = `${type}-${id}.json`;
        const cachePath = path.resolve(cacheDir, cacheName);
        return {
            cacheName,
            cachePath
        };
    },

    betterMinimatch: (str, pattern) => {
        str = `${str}`;
        pattern = `${pattern}`;

        if (pattern === '*') {
            return true;
        }

        // includes first
        if (str.includes(pattern)) {
            return true;
        }

        // with minimatch
        if (minimatch(str, pattern)) {
            return true;
        }

        // after decode url
        str = decodeURIComponent(str);

        if (str.includes(pattern)) {
            return true;
        }

        if (minimatch(str, pattern)) {
            return true;
        }

        return false;
    },

    // eslint-disable-next-line complexity
    getEntryFilter: (options) => {
        // for entry.url

        if (options.entryFilterHandler) {
            return options.entryFilterHandler;
        }

        let input = options.entryFilter || options.filter;

        // for function handler
        if (typeof input === 'function') {
            options.entryFilterHandler = input;
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
                const handler = (entry) => {
                    return Util.betterMinimatch(entry.url, input);
                };
                options.entryFilterHandler = handler;
                return handler;
            }
        }

        // for patterns
        if (input && typeof input === 'object') {
            const patterns = Object.keys(input);
            const handler = (entry) => {
                const url = entry.url;
                for (const pattern of patterns) {
                    if (Util.betterMinimatch(url, pattern)) {
                        return input[pattern];
                    }
                }
                // false if not matched
            };
            options.entryFilterHandler = handler;
            return handler;
        }

        // default
        const handler = () => true;
        options.entryFilterHandler = handler;
        return handler;
    },

    // eslint-disable-next-line complexity
    getSourceFilter: (options) => {
        // for sourcePath

        if (options.sourceFilterHandler) {
            return options.sourceFilterHandler;
        }

        let input = options.sourceFilter || options.filter;

        // for function handler
        if (typeof input === 'function') {
            options.sourceFilterHandler = input;
            return input;
        }

        // for single minimatch pattern
        if (input && typeof input === 'string') {
        // string to multiple patterns "{...}"
        // mcr npx mocha --sourceFilter {'**/node_modules/**':false,'**/src/*.js':true}
        // mcr npx mocha --sourceFilter "{'**/node_modules/**': false, '**/src/*.js': true}"
            const obj = Util.strToObj(input);
            if (obj) {
                input = obj;
            } else {
                const handler = (sourcePath) => {
                    return Util.betterMinimatch(sourcePath, input);
                };
                options.sourceFilterHandler = handler;
                return handler;
            }
        }

        // for patterns
        if (input && typeof input === 'object') {
            const patterns = Object.keys(input);
            const handler = (sourcePath) => {
                for (const pattern of patterns) {
                    if (Util.betterMinimatch(sourcePath, pattern)) {
                        return input[pattern];
                    }
                }
            // false if not matched
            };
            options.sourceFilterHandler = handler;
            return handler;
        }

        // default
        const handler = () => true;
        options.sourceFilterHandler = handler;
        return handler;
    },

    setEmptyV8Coverage: (entry) => {
        if (entry.type === 'css') {
            // empty css
            if (!entry.ranges) {
                entry.ranges = [];
            }
        } else {
            // empty js
            if (!entry.functions) {
                entry.functions = [{
                    functionName: '',
                    ranges: [{
                        startOffset: 0,
                        endOffset: entry.source ? entry.source.length : 0,
                        count: 0
                    }]
                }];
            }
        }
    },

    saveSourceCacheFile: async (sourceData, options, fileCache) => {
        const { cacheName, cachePath } = Util.getCacheFileInfo('source', sourceData.id, options.cacheDir);

        // file cache for add() to generate()
        if (fileCache) {
            fileCache.set(cacheName, sourceData);
        }

        await Util.writeFile(cachePath, JSON.stringify(sourceData));

        // save source and sourcemap file for debug
        // https://evanw.github.io/source-map-visualization
        if (options.sourceMap && sourceData.sourceMap) {
            const filePath = cachePath.slice(0, -5);
            await Util.writeFile(`${filePath}.js`, sourceData.source);
            await Util.writeFile(`${filePath}.js.map`, JSON.stringify(sourceData.sourceMap));
        }
    },

    findUpConfig: (customConfigFile) => {
        if (customConfigFile) {
            if (fs.existsSync(customConfigFile)) {
                return customConfigFile;
            }
            // custom config not found
            return;
        }

        const defaultConfigList = [
            'mcr.config.js',
            'mcr.config.cjs',
            'mcr.config.mjs',
            'mcr.config.json',
            'mcr.config.ts'
        ];

        const configPath = findUpSync(defaultConfigList);
        if (configPath) {
            return configPath;
        }

        // default config not found
    },

    getEOL: function(content) {
        if (!content) {
            return os.EOL;
        }
        const nIndex = content.lastIndexOf('\n');
        if (nIndex === -1) {
            return os.EOL;
        }
        if (content.substr(nIndex - 1, 1) === '\r') {
            return '\r\n';
        }
        return '\n';
    },

    visitAst: (rootNode, visitors) => {
        const baseVisitor = acornWalk.base;
        const parents = [rootNode];
        const visitor = (node, st, override) => {
            const type = override || node.type;
            // console.log('visit', node.type, override, parents.length);
            const handler = visitors[type];
            if (handler) {
                const res = handler(node, parents);
                if (res === 'break') {
                    return;
                }
            }
            const isNew = node !== parents[parents.length - 1];
            if (isNew) {
                parents.push(node);
            }
            baseVisitor[type](node, st, visitor);
            if (isNew) {
                parents.pop();
            }
        };
        visitor(rootNode);
    },

    updateOffsetToLocation: (locator, loc) => {
        const sLoc = locator.offsetToLocation(loc.start);
        loc.start = {
            line: sLoc.line,
            column: sLoc.column
        };
        const eLoc = locator.offsetToLocation(loc.end);
        loc.end = {
            line: eLoc.line,
            column: eLoc.column
        };
    },

    // offset key
    sortOffsetRanges: (ranges) => {
        ranges.sort((a, b) => {
            if (a.startOffset === b.startOffset) {
                return a.endOffset - b.endOffset;
            }
            return a.startOffset - b.startOffset;
        });
    },

    forEachFile: function(dir, extList, callback) {
        if (!fs.existsSync(dir)) {
            return;
        }
        // all exts, full name, ext
        const isMatched = (name) => !Util.isList(extList) || extList.includes(name) || extList.includes(path.extname(name));
        const subDirs = [];
        const subDirHandler = () => {
            if (!subDirs.length) {
                return;
            }

            for (const subDir of subDirs) {
                const res = Util.forEachFile(subDir, extList, callback);
                if (res === 'break') {
                    return;
                }
            }
        };

        const list = fs.readdirSync(dir);
        for (const name of list) {
            const abs = path.resolve(dir, name);
            const info = fs.statSync(abs);
            if (info.isDirectory()) {
                subDirs.push(abs);
                continue;
            }

            if (info.isFile() && isMatched(name)) {
                const res = callback(name, dir);
                if (res === 'break') {
                    return;
                }
            }

        }

        subDirHandler();

    },

    readFileSync: function(filePath) {
        if (fs.existsSync(filePath)) {
            // Returns: <string> | <Buffer>
            const buf = fs.readFileSync(filePath);
            if (Buffer.isBuffer(buf)) {
                return buf.toString('utf8');
            }
            return buf;
        }
    },

    readFile: async (filePath) => {
        if (fs.existsSync(filePath)) {
            const buf = await readFile(filePath).catch((e) => {
                Util.logError(`read file: ${filePath} ${e.message || e}`);
            });
            if (Buffer.isBuffer(buf)) {
                return buf.toString('utf8');
            }
            return buf;
        }
    },

    readJson: async (jsonPath) => {
        const content = await Util.readFile(jsonPath);
        if (content) {
            return JSON.parse(content);
        }
    },

    writeFileSync: function(filePath, content) {
        if (!fs.existsSync(filePath)) {
            const p = path.dirname(filePath);
            if (!fs.existsSync(p)) {
                fs.mkdirSync(p, {
                    recursive: true
                });
            }
        }
        fs.writeFileSync(filePath, content);
    },

    writeFile: async (filePath, content) => {
        if (!fs.existsSync(filePath)) {
            const p = path.dirname(filePath);
            if (!fs.existsSync(p)) {
                fs.mkdirSync(p, {
                    recursive: true
                });
            }
        }
        await writeFile(filePath, content).catch((e) => {
            Util.logError(`write file: ${filePath} ${e.message || e}`);
        });
    },

    rmSync: (p) => {
        if (!fs.existsSync(p)) {
            return;
        }
        try {
            fs.rmSync(p, {
                recursive: true,
                force: true,
                maxRetries: 10
            });
        } catch (err) {
            console.log(err.message);
        }
    },

    normalizeColorType: (color) => {
        return `${color}`.trim().toLowerCase();
    },

    normalizeMaxCols: (maxCols, min = 1) => {
        if (Util.isNum(maxCols)) {
            return Math.max(maxCols, min);
        }
    },

    getColorStrByStatus: (str, status, color = '') => {

        const colorHandlers = {
            'ansicode': () => {
                if (status === 'low') {
                    return EC.red(str);
                }
                if (status === 'medium') {
                    return EC.yellow(str);
                }
                if (status === 'high') {
                    return EC.green(str);
                }
                return str;
            },
            'unicode': () => {
                if (status === 'low') {
                    return `🔴 ${str}`;
                }
                if (status === 'medium') {
                    return `🟡 ${str}`;
                }
                if (status === 'high') {
                    return `🟢 ${str}`;
                }
                return str;
            },
            'html': () => {
                if (status === 'low') {
                    return `<font color="red">${str}</font>`;
                }
                if (status === 'medium') {
                    return `<font color="orange">${str}</font>`;
                }
                if (status === 'high') {
                    return `<font color="green">${str}</font>`;
                }
                return str;
            },
            'tex': () => {
                const texStr = str.replace(/%/g, '\\\\%');
                if (status === 'low') {
                    return `$\\color{red}{\\textsf{${texStr}}}$`;
                }
                if (status === 'medium') {
                    return `$\\color{orange}{\\textsf{${texStr}}}$`;
                }
                if (status === 'high') {
                    return `$\\color{green}{\\textsf{${texStr}}}$`;
                }
                return str;
            }
        };

        const handler = colorHandlers[color];
        if (handler) {
            return handler();
        }
        // no color
        return str;
    },

    getUncoveredLines: (dataLines, color = '') => {

        const lines = [];

        let startLine;
        let endLine;

        const getHtmlColor = (c) => {
            return c === 'yellow' ? 'orange' : c;
        };

        const getAnsiLink = () => {
            if (startLine.value !== 'red' && endLine.value !== 'red' && endLine.line - startLine.line === 1) {
                return EC.yellow('-');
            }
            return EC.red('-');
        };

        const getHtmlLink = () => {
            if (startLine.value !== 'red' && endLine.value !== 'red' && endLine.line - startLine.line === 1) {
                return '<font color="orange">-</font>';
            }
            return '<font color="red">-</font>';
        };

        const addRangeItem = () => {
            if (color === 'ansicode') {
                lines.push(EC[startLine.value](startLine.line) + getAnsiLink() + EC[endLine.value](endLine.line));
                return;
            }

            if (color === 'html') {
                lines.push(`<font color="${getHtmlColor(startLine.value)}">${startLine.line}</font>${getHtmlLink()}<font color="${getHtmlColor(endLine.value)}">${endLine.line}</font>`);
                return;
            }

            // no color
            lines.push(`${startLine.line}-${endLine.line}`);

        };

        const addStartItem = () => {
            if (color === 'ansicode') {
                lines.push(EC[startLine.value](startLine.line));
                return;
            }

            if (color === 'html') {
                lines.push(`<font color="${getHtmlColor(startLine.value)}">${startLine.line}</font>`);
                return;
            }

            // no color
            lines.push(startLine.line);

        };

        const addLines = () => {
            if (!startLine) {
                return;
            }
            if (endLine) {
                // range
                addRangeItem();
                startLine = null;
                endLine = null;
            } else {
                // only start
                addStartItem();
                startLine = null;
            }
        };

        const setLines = (line, value) => {
            if (startLine) {
                endLine = {
                    line,
                    value
                };
                return;
            }
            startLine = {
                line,
                value
            };
        };

        Object.keys(dataLines).forEach((line) => {
            const count = dataLines[line];
            if (count === 0) {
                setLines(line, 'red');
                return;
            }
            // 0 < count < 1
            if (typeof count === 'string') {
                setLines(line, 'yellow');
                return;
            }
            // count >= 1
            addLines();
        });
        addLines();

        return lines.join(',');
    },

    // skip \s and comments
    fixSourceRange: (locator, start, end) => {

        let fixedStart = start;
        let fixedEnd = end;

        const rangeText = locator.getSlice(start, end);

        let text = rangeText;

        // =======================================
        // handle end first
        const oldLen = text.length;
        text = text.trimEnd();
        const newLen = text.length;
        if (newLen < oldLen) {
            fixedEnd -= oldLen - newLen;
        }

        // =======================================
        // handle start

        const comments = locator.lineParser.commentParser.comments;

        let startOffset = 0;

        // never start in a comment, skip to comment end
        const inComment = comments.find((it) => start > it.start && start < it.end);
        if (inComment) {
            startOffset = inComment.end - start;
            // next text
            text = text.slice(startOffset);
        }

        while (startOffset < newLen) {

            const beforeLen = text.length;
            text = text.trimStart();
            const afterLen = text.length;
            if (afterLen === beforeLen) {
                // no indent
                break;
            }

            const indentLen = beforeLen - afterLen;

            startOffset += indentLen;

            // no comments
            if (!comments.length) {
                break;
            }

            const nextPos = start + startOffset;
            const comment = comments.find((it) => it.start === nextPos);
            if (!comment) {
                break;
            }

            const commentLen = comment.end - comment.start;

            startOffset += commentLen;

            // next text
            text = text.slice(commentLen);

        }

        // It should never be possible to start with }
        if (rangeText[startOffset] === '}') {
            startOffset += 1;
        }

        fixedStart = start + startOffset;

        return {
            fixedStart,
            fixedEnd
        };
    },

    cmpVersion: (v1, v2) => {
        const [strMajor1, strMinor1, strPatch1] = `${v1}`.split('.');
        const [strMajor2, strMinor2, strPatch2] = `${v2}`.split('.');
        const strList = [strMajor1, strMinor1, strPatch1, strMajor2, strMinor2, strPatch2];
        const list = strList.map((str) => Util.toNum(parseInt(str)));
        const [major1, minor1, patch1, major2, minor2, patch2] = list;
        if (major1 === major2) {
            if (minor1 === minor2) {
                return patch1 - patch2;
            }
            return minor1 - minor2;
        }
        return major1 - major2;
    },

    // ==========================================================================================

    loggingLevels: {
        off: 0,
        error: 10,
        info: 20,
        debug: 30
    },
    loggingLevel: 20,

    isDebug: () => {
        return Util.loggingType === 'debug';
    },

    initLoggingLevel: (level) => {

        const types = {
            off: 'off',
            error: 'error',
            info: 'info',
            debug: 'debug'
        };

        level = level || process.env.MCR_LOGGING;

        const type = types[level] || types.info;
        Util.loggingType = type;
        Util.loggingLevel = Util.loggingLevels[type];

        // console.log('=========================================');
        // console.log(from, Util.loggingType, Util.loggingLevel);

        return type;
    },

    logError: (message) => {
        if (Util.loggingLevel < Util.loggingLevels.error) {
            return;
        }
        EC.logRed(`[MCR] ${message}`);
    },

    logInfo: (message) => {
        if (Util.loggingLevel < Util.loggingLevels.info) {
            return;
        }
        console.log(`[MCR] ${message}`);
    },

    // grid is info level
    logGrid: (gridData) => {
        if (Util.loggingLevel < Util.loggingLevels.info) {
            return;
        }
        CG(gridData);
    },

    logDebug: (message) => {
        if (Util.loggingLevel < Util.loggingLevels.debug) {
            return;
        }
        console.log(`[MCR] ${message}`);
    },

    logFilter: (message, lengthBefore, lengthAfter) => {
        if (Util.loggingLevel < Util.loggingLevels.debug) {
            return;
        }
        if (lengthAfter < lengthBefore) {
            lengthBefore = EC.yellow(lengthBefore);
            lengthAfter = EC.yellow(lengthAfter);
        }
        console.log(`[MCR] ${message} before ${lengthBefore} => after ${lengthAfter}`);
    },

    setGC: (threshold) => {
        if (!Util.isNum(threshold)) {
            threshold = 1024;
        }
        Util.gcThreshold = threshold;
    },

    getMemory: () => {
        const { heapUsed } = process.memoryUsage();
        const memory = parseFloat((heapUsed / 1024 ** 2).toFixed(1));
        return memory;
    },

    // time is debug level, fix the log info, for checking snapshot
    logTime: (message, time_start) => {

        // memory gc
        let memory = Util.getMemory();
        if (Util.gcThreshold && Util.gcThreshold < memory) {
            Util.forceGC();
        }

        if (Util.loggingLevel < Util.loggingLevels.debug && !process.env.MCR_LOG_TIME) {
            return;
        }
        const duration = Date.now() - time_start;
        const durationH = Util.TF(duration);
        const ls = [`[MCR] ${message}`];

        memory = Util.getMemory();
        ls.push(` (memory: ${memory}MB)`);

        // time
        ls.push(' (');
        if (duration <= 100) {
            ls.push(EC.green(durationH));
        } else if (duration < 500) {
            ls.push(EC.yellow(durationH));
        } else {
            ls.push(EC.red(durationH));
        }
        ls.push(')');

        console.log(ls.join(''));
    }

};

module.exports = Util;
