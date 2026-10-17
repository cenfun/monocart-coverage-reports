import path from 'node:path';
import { Util } from '../utils/util.js';

const v8JsonReport = async (reportData, reportOptions, options) => {
    const v8JsonOptions = {
        outputFile: 'coverage-report.json',
        ... reportOptions
    };

    // console.log(mergedOptions);
    const jsonPath = path.resolve(options.outputDir, v8JsonOptions.outputFile);
    const reportPath = Util.relativePath(jsonPath);

    reportData.reportPath = reportPath;

    await Util.writeFile(jsonPath, JSON.stringify(reportData));
    return reportPath;
};

export { v8JsonReport };
