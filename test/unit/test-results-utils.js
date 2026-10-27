import fs from 'node:fs';

const getTestResultsFiles = (args) => {
    const reporterArg = args.find((arg) => arg.startsWith('--test-reporter=file:'));
    const reporterURL = new URL(reporterArg.slice('--test-reporter='.length));
    const destination = args.find((arg) => arg.startsWith('--test-reporter-destination=') && !arg.endsWith('=stdout'));
    const outputPath = destination.slice('--test-reporter-destination='.length);
    return {
        id: reporterURL.searchParams.get('id'),
        outputPath,
        metadataPath: reporterURL.searchParams.get('meta'),
        cachePath: outputPath.slice(0, -4)
    };
};

const writeTestResults = (args, data = {}) => {
    const files = getTestResultsFiles(args);
    const results = {
        id: files.id, framework: 'node:test', complete: true, summary: {}, tests: [], ... data
    };
    const json = JSON.stringify(results);
    fs.writeFileSync(files.outputPath, json);
    fs.writeFileSync(files.metadataPath, JSON.stringify({
        id: files.id, complete: results.complete, byteLength: Buffer.byteLength(json)
    }));
    return results;
};

export { getTestResultsFiles, writeTestResults };
