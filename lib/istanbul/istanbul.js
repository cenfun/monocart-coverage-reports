import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import istanbulLibCoverage from 'istanbul-lib-coverage';
import istanbulLibReport from 'istanbul-lib-report';
import EC from 'eight-colors';

import { Util } from '../utils/util.js';
import { IstanbulSummary } from './istanbul-summary.js';

import { initIstanbulSourcePath } from '../utils/source-path.js';
import { getUntestedList } from '../converter/untested.js';

const findHtmlPath = (outputDir) => {
    const defaultHtml = path.resolve(outputDir, 'index.html');
    if (fs.existsSync(defaultHtml)) {
        return defaultHtml;
    }

    const htmlList = [];
    Util.forEachFile(outputDir, ['.html'], (name, dir) => {
        const htmlPath = path.resolve(dir, name);
        if (name === 'index.html') {
            htmlList.unshift(htmlPath);
            return 'break';
        }
        htmlList.push(htmlPath);
    });

    if (htmlList.length) {
        return htmlList[0];
    }

    return defaultHtml;

};

const require = createRequire(import.meta.url);

const createIstanbulReport = async (name, options) => {
    let reporter;
    const isFile = path.isAbsolute(name) || name.startsWith('.');
    // Built-in reports remain CommonJS dependencies; custom reports may be ESM.
    if (!isFile) {
        try {
            reporter = await import(`istanbul-reports/lib/${name}/index.js`);
        } catch (error) {
            if (error.code !== 'ERR_MODULE_NOT_FOUND') {
                throw error;
            }
        }
    }
    if (!reporter) {
        // Preserve CommonJS extension and directory resolution for local paths,
        // but use import() to support both CommonJS and ESM reporter modules.
        const specifier = isFile ? pathToFileURL(require.resolve(path.resolve(name))).href : name;
        reporter = await import(specifier);
    }
    const Reporter = reporter.default || reporter;
    return new Reporter(options);
};

const saveIstanbulReports = async (coverageData, fileSources, options) => {

    coverageData = initIstanbulSourcePath(coverageData, fileSources, options);

    const coverageMap = istanbulLibCoverage.createCoverageMap(coverageData);

    const defaultWatermarks = {
        statements: [50, 80],
        branches: [50, 80],
        functions: [50, 80],
        lines: [50, 80]
    };
    const watermarks = Util.resolveWatermarks(defaultWatermarks, options.watermarks);

    // https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-lib-report

    // defaultSummarizer and sourceFinder can be passed from options
    const contextOptions = {
        coverageMap,
        // The summarizer to default to (may be overridden by some reports)
        // values can be nested/flat/pkg. Defaults to 'pkg'
        defaultSummarizer: options.defaultSummarizer || 'nested',

        dir: options.outputDir,
        watermarks,
        sourceFinder: (filePath) => {

            // console.log(`find file source: ${filePath}`);

            if (fileSources) {
                const source = fileSources[filePath];
                if (source) {
                    return source;
                }
            }

            if (typeof options.sourceFinder === 'function') {
                const source = options.sourceFinder(filePath);
                if (source) {
                    return source;
                }
            }

            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }

            // console.log('Not found source file:', filePath);

            return `Not found source file: ${filePath}`;
        }
    };

    // create a context for report generation
    const context = istanbulLibReport.createContext(contextOptions);

    const istanbulGroup = options.reportGroup.get('istanbul');
    // already has
    if (istanbulGroup) {
        for (const [reportName, reportOptions] of istanbulGroup) {
            const t1 = Date.now();
            const report = await createIstanbulReport(reportName, reportOptions);
            report.execute(context);
            Util.logTime(`${EC.magenta('├')} [generate] saved report: ${reportName}`, t1);
        }
    }

    // add watermarks and color
    const coverageReport = new IstanbulSummary();
    coverageReport.execute(context);

    const reportPath = Util.resolveReportPath(options, () => {
        // find first index.html path for preview
        const htmlPath = findHtmlPath(options.outputDir);
        return Util.relativePath(htmlPath);
    });

    const coverageResults = {
        type: 'istanbul',
        reportPath,
        version: Util.version,
        name: options.name,
        watermarks: contextOptions.watermarks,
        // summary and files
        ... coverageReport.getReport()
    };

    return coverageResults;
};

const addUntestedFiles = async (istanbulData, options) => {
    const testedMap = new Map();
    Object.keys(istanbulData).forEach((filePath) => {
        const sourcePath = Util.relativePath(filePath);
        testedMap.set(sourcePath, true);
    });

    // untested files
    const untestedList = await getUntestedList(testedMap, options, 'istanbul');
    if (!untestedList) {
        return;
    }

    // console.log('istanbul untestedList', untestedList);
    untestedList.forEach((item) => {
        if (!istanbulData[item.path]) {
            istanbulData[item.path] = istanbulLibCoverage.createFileCoverage(item);
        }
    });

};

const mergeIstanbulDataList = (dataList, options) => {
    const istanbulCoverageList = dataList.map((it) => it.data);
    const coverageMap = istanbulLibCoverage.createCoverageMap();
    istanbulCoverageList.forEach((coverage) => {
        coverageMap.merge(coverage);
    });
    const istanbulData = coverageMap.toJSON();
    return istanbulData;
};

const mergeIstanbulCoverage = async (dataList, options) => {
    const istanbulData = mergeIstanbulDataList(dataList, options);
    await addUntestedFiles(istanbulData, options);
    return istanbulData;
};

export {
    saveIstanbulReports,
    mergeIstanbulDataList,
    mergeIstanbulCoverage
};
