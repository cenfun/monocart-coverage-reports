const fs = require('fs');
const path = require('path');
const { deflateSync, inflateSync } = require('lz-utils');
const Util = require('./utils/util.js');
const assetsMap = require('./packages/monocart-coverage-assets.js');

const Assets = {

    getFileContent: (id) => {
        const compressed = assetsMap[id];
        if (!compressed) {
            Util.logError(`Not found module: ${id}`);
            return '';
        }
        return inflateSync(compressed);
    },

    saveHtmlReport: async (options) => {

        const {
            inline,
            reportData,
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

        // deps
        jsList.push({
            filename: 'monocart-coverage-app.js',
            str: Assets.getFileContent('monocart-coverage-app')
        });

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
        const template = Assets.getFileContent('template');
        const html = Util.replace(template, {
            title: reportData.title,
            content: htmlStr
        });

        await Util.writeFile(htmlPath, html);

        return reportPath;
    }
};

module.exports = Assets;
