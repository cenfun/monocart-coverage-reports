import path from 'node:path';

// Snapshot names belong to the report directory, not the site's path depth.
export const getSnapshotId = (reportPath) => {
    const reportsDir = path.resolve(import.meta.dirname, '../.temp/site/reports');
    const relative = path.relative(reportsDir, path.resolve(reportPath));
    const [id, ... entry] = relative.split(path.sep);
    if (!id || id === '..' || path.isAbsolute(relative) || !entry.length) {
        throw new Error(`Report path is outside the integration report directories: ${reportPath}`);
    }
    return id;
};
