// Clean generated site output before docs builds or integration test groups.
// Imported by build-docs.js and test/test.js; uses only Node.js built-ins.
// Documentation cleanup preserves reports; test cleanup preserves documentation too.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = fileURLToPath(new URL('../.temp/site/', import.meta.url));

const isLegacyReport = async (entryPath) => {
    try {
        const html = await fs.readFile(path.join(entryPath, 'index.html'), 'utf8');
        return html.includes('<!-- mcr-legacy-report -->');
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    // Combined reports can have only nested redirect pages, with no root index.
    const entries = await fs.readdir(entryPath, {
        withFileTypes: true
    });
    if (!entries.length) {
        return false;
    }
    for (const entry of entries) {
        if (!entry.isDirectory() || !await isLegacyReport(path.join(entryPath, entry.name))) {
            return false;
        }
    }
    return true;
};

const readSiteEntries = async () => {
    try {
        return await fs.readdir(siteDir, {
            withFileTypes: true
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

export const cleanSite = async ({ documentation = false } = {}) => {
    const entries = await readSiteEntries();
    for (const entry of entries) {
        if (entry.name === 'reports') {
            continue;
        }
        const entryPath = path.join(siteDir, entry.name);
        // Old report URLs were emitted as marked redirect pages. Do not
        // infer report directories from names that could also be docs routes.
        if (!documentation && (!entry.isDirectory() || !await isLegacyReport(entryPath))) {
            continue;
        }
        await fs.rm(entryPath, {
            recursive: true,
            force: true
        });
    }
};
