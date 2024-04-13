const fs = require('fs');
const { writeFile, readFile } = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const os = require('os');
const crypto = require('crypto');
const EC = require('eight-colors');
const CG = require('console-grid');
const Share = require('../platform/share.js');
const request = require('./request.js');
const { deflateSync } = require('lz-utils');

const { acornWalk, supportsColor } = require('../packages/monocart-coverage-vendor.js');

// https://github.com/chalk/supports-color
// disabled color if Terminal stdout does not support color
if (!supportsColor.stdout) {
    EC.disabled = true;
}

const Util = {
    ... Share,

    EC,
    CG,

    root: process.cwd(),

    request,

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
        try {
            url = new URL(input, base);
        } catch (e) {
            // console.error('error url', input);
            return;
        }
        return url;
    },

    resolveCacheSourcePath: (cacheDir, id) => {
        const filename = `source-${id}.json`;
        const sourcePath = path.resolve(cacheDir, filename);
        return sourcePath;
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

    resolveNodeModule: (id) => {

        // for deno npm module
        const mp = require.resolve(id);
        if (fs.existsSync(mp)) {
            return mp;
        }

        const p = `${it}/dist/${it}.js`;
        // root
        const cwd = path.resolve('node_modules', p);
        if (fs.existsSync(cwd)) {
            return cwd;
        }

        // sub node modules
        const sub = path.resolve(__dirname, '../../node_modules', p);
        if (fs.existsSync(sub)) {
            return sub;
        }

        // same level dep
        const dep = path.resolve(__dirname, '../../../', p);
        if (fs.existsSync(dep)) {
            return dep;
        }

        Util.logError(`Not found module: ${p}`);

        return cwd;
    },

    resolvePackage: (p) => {
        return path.resolve(__dirname, '../packages', p);
    },

    saveHtmlReport: async (options) => {

        const {
            inline,
            reportData,
            jsFiles,
            assetsPath,
            outputDir,
            htmlFile,

            reportDataFile
        } = options;

        //  report data
        const reportDataCompressed = deflateSync(JSON.stringify(reportData));
        const reportDataStr = `window.reportData = '${reportDataCompressed}';`;

        // js libs
        const jsList = [];
        for (const jsFile of jsFiles) {
            const jsStr = await Util.readFile(jsFile);
            jsList.push({
                filename: path.basename(jsFile),
                str: jsStr
            });
        }

        // html content
        let htmlStr = '';
        const EOL = Util.getEOL();
        if (inline) {
            htmlStr = [
                '<script>',
                reportDataStr,
                ... jsList.map((it) => it.str),
                '</script>'
            ].join(EOL);
        } else {

            await Util.writeFile(path.resolve(outputDir, reportDataFile), reportDataStr);

            const assetsDir = path.resolve(outputDir, assetsPath);
            const relAssetsDir = Util.relativePath(assetsDir, outputDir);

            for (const item of jsList) {
                const filePath = path.resolve(assetsDir, item.filename);
                if (!fs.existsSync(filePath)) {
                    await Util.writeFile(filePath, item.str);
                }
            }

            htmlStr = [
                `<script src="${reportDataFile}"></script>`,
                ... jsList.map((it) => `<script src="${relAssetsDir}/${it.filename}"></script>`)
            ].join(EOL);
        }

        // html
        const htmlPath = path.resolve(outputDir, htmlFile);
        const template = Util.getTemplate(path.resolve(__dirname, '../default/template.html'));
        const html = Util.replace(template, {
            title: reportData.title,
            content: htmlStr
        });

        await Util.writeFile(htmlPath, html);

        return Util.relativePath(htmlPath);
    },

    runCustomReporter: async (reportName, reportData, reportOptions, globalOptions) => {
        let CustomReporter;
        let err;
        try {
            CustomReporter = await import(reportName);
        } catch (e) {
            err = e;
            try {
                CustomReporter = await import(pathToFileURL(reportName));
            } catch (ee) {
                err = ee;
            }
        }

        if (!CustomReporter) {
            Util.logError(err.message);
            return;
        }

        CustomReporter = CustomReporter.default || CustomReporter;

        const reporter = new CustomReporter(reportOptions, globalOptions);

        const results = await reporter.generate(reportData);

        return results;
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

    getTemplate: function(templatePath) {
        if (!Util.templateCache) {
            Util.templateCache = {};
        }
        let template = Util.templateCache[templatePath];
        if (!template) {
            template = Util.readFileSync(templatePath);
            if (template) {
                Util.templateCache[templatePath] = template;
            } else {
                Util.logError(`not found template: ${templatePath}`);
            }
        }
        return template;
    },

    getColorStrByStatus: (str, status) => {
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

    // time is debug level, fix the log info, for checking snapshot
    logTime: (message, time_start) => {
        if (Util.loggingLevel < Util.loggingLevels.debug) {
            return;
        }
        const duration = Date.now() - time_start;
        const durationH = Util.TF(duration);
        const ls = [`[MCR] ${message}`, ' ('];
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
