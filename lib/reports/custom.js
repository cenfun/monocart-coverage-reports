import path from 'node:path';
import { pathToFileURL } from 'node:url';

const customReport = async (reportName, reportData, reportOptions, globalOptions) => {
    // Use native ESM loading, including Node's built-in CJS interoperability.
    const isFile = path.isAbsolute(reportName) || reportName.startsWith('.');
    const specifier = isFile ? pathToFileURL(path.resolve(reportName)).href : reportName;
    const reporterModule = await import(specifier);
    const CustomReporter = reporterModule.default || reporterModule;

    const reporter = new CustomReporter(reportOptions, globalOptions);

    const results = await reporter.generate(reportData);

    return results;
};

export { customReport };
