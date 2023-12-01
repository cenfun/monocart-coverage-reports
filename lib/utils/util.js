const fs = require('fs');
const { writeFile, readFile } = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const EC = require('eight-colors');
const CG = require('console-grid');
const Share = require('../platform/share.js');
const { deflateSync } = require('lz-utils');

const defaultOptions = require('../options.js');

const Util = {

    root: process.cwd(),

    ... Share,

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

    calculateSha1(buffer) {
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

    resolveOutputFile: async (outputFile) => {
        // function to string first
        if (typeof outputFile === 'function') {
            outputFile = await outputFile();
        }
        // then check string
        if (!outputFile || typeof outputFile !== 'string') {
            outputFile = defaultOptions.outputFile;
        }
        return path.resolve(outputFile);
    },

    resolveOutputDir: (outputFile) => {
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, {
                recursive: true
            });
        }
        return outputDir;
    },

    resolveCacheDir: (outputDir, cacheDirName) => {
        const cacheDir = path.resolve(outputDir, cacheDirName);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, {
                recursive: true
            });
        }
        return cacheDir;
    },

    resolveCacheSourcePath: (cacheDir, id) => {
        const filename = `source-${id}.json`;
        const sourcePath = path.resolve(cacheDir, filename);
        return sourcePath;
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
        const template = Util.getTemplate(path.resolve(__dirname, '../template.html'));
        const html = Util.replace(template, {
            title: reportData.title,
            content: htmlStr
        });

        await Util.writeFile(htmlPath, html);

        return Util.relativePath(htmlPath);
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
                Util.logError(e.message || e);
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
            Util.logError(e.message || e);
        });
    },

    rmSync: (p) => {
        if (fs.existsSync(p)) {
            fs.rmSync(p, {
                recursive: true,
                force: true
            });
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

    // ==========================================================================================

    loggingLevels: {
        off: 0,
        error: 10,
        info: 20,
        debug: 30
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

    // time is debug level
    logTime: (message, time_start) => {
        if (Util.loggingLevel < Util.loggingLevels.debug) {
            return;
        }
        const duration = Date.now() - time_start;
        const durationH = Util.TSF(duration);
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
