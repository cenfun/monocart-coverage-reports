import path from 'node:path';
import { Util } from '../utils/util.js';
import { calculateSha1 } from '../utils/source-id.js';

const sourcePattern = /^source-(\d+)-(\d+)-([a-f\d]{40})-([a-f\d]{40})(?:-ts)?\.json$/;
const coveragePattern = /^coverage-(\d+)-\d+-(\d+)\.json$/;

const selectSource = (previous, current, url) => {
    if (!current || current.url !== url || typeof current.source !== 'string') {
        throw new Error(`Invalid captured source for ${url}`);
    }
    if (previous && previous.source !== current.source) {
        throw new Error(`Ambiguous captured source versions for ${url}. Collect each build in a separate NODE_V8_COVERAGE directory.`);
    }
    if (previous?.nativeTypeScript === true) {
        current.nativeTypeScript = true;
    }
    return current;
};

const readLegacySources = async (filenames, read) => {
    const sources = new Map();
    for (const filename of filenames) {
        const json = await read(filename);
        if (json?.url) {
            const list = sources.get(json.url) || [];
            list.push(filename);
            sources.set(json.url, list);
        }
    }
    return sources;
};

const readSelectedSources = async (filenames, url, read) => {
    let selected;
    for (const filename of filenames) {
        selected = selectSource(selected, await read(filename), url);
    }
    return selected;
};

// Index filenames first, then cache lazy reads across coverage snapshots.
// Only read sources of retained entries from
// the same PID/thread as Node's coverage file. Old captures remain readable,
// but conflicting legacy versions must fail rather than silently choose one.
const createSourceReader = (dir, filenames) => {
    const index = new Map();
    const legacy = [];
    let legacySources;
    for (const filename of filenames) {
        const match = sourcePattern.exec(filename);
        if (!match) {
            legacy.push(filename);
            continue;
        }
        const key = `${match[1]}-${match[2]}-${match[3]}`;
        const list = index.get(key) || [];
        list.push(filename);
        index.set(key, list);
    }

    const captured = new Map();
    const readFile = async (filename) => {
        const content = await Util.readFile(path.resolve(dir, filename));
        if (!content) {
            throw new Error(`Cannot read captured source: ${filename}`);
        }
        return JSON.parse(content);
    };
    const read = (filename) => {
        if (!captured.has(filename)) {
            captured.set(filename, readFile(filename));
        }
        return captured.get(filename);
    };

    return async (url, coverageFilename) => {
        const match = coveragePattern.exec(coverageFilename);
        const files = match && index.get(`${match[1]}-${match[2]}-${calculateSha1(url)}`);
        if (files) {
            return readSelectedSources(files, url, read);
        }
        if (!legacy.length) {
            return;
        }
        if (!legacySources) {
            legacySources = await readLegacySources(legacy, read);
        }
        return readSelectedSources(legacySources.get(url) || [], url, read);
    };
};

export { createSourceReader };
