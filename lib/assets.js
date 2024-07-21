const fs = require('fs');
const path = require('path');
const { deflateSync } = require('lz-utils');
const Util = require('./utils/util.js');

const Assets = {
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
        const sub = path.resolve(__dirname, '../node_modules', p);
        if (fs.existsSync(sub)) {
            return sub;
        }

        // same level dep
        const dep = path.resolve(__dirname, '../../', p);
        if (fs.existsSync(dep)) {
            return dep;
        }

        Util.logError(`Not found module: ${p}`);

        return cwd;
    },

    resolvePackage: (p) => {
        return path.resolve(__dirname, './packages', p);
    },

    saveHtmlReport: async (options) => {

        const {
            inline,
            reportData,
            jsFiles,
            assetsPath,
            outputDir,
            htmlFile,

            saveReportPath,

            reportDataFile
        } = options;

        // save path
        const htmlPath = path.resolve(outputDir, htmlFile);
        const reportPath = Util.relativePath(htmlPath);
        if (saveReportPath) {
            reportData[saveReportPath] = reportPath;
        }

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
        const template = Assets.getTemplate();
        const html = Util.replace(template, {
            title: reportData.title,
            content: htmlStr
        });

        await Util.writeFile(htmlPath, html);

        return reportPath;
    },

    getTemplate: function() {

        if (Assets.templateCache) {
            return Assets.templateCache;
        }

        const templatePath = path.resolve(__dirname, './default/template.html');
        const template = Util.readFileSync(templatePath);
        if (template) {
            Assets.templateCache = template;
        } else {
            Util.logError(`not found template: ${templatePath}`);
        }

        return template;
    }
};

module.exports = Assets;
