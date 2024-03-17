const fs = require('fs');
const path = require('path');
const os = require('os');
const { geteuid } = process;

const checkSnapshot = require('./check-snapshot.js');

let caches;
const getCaches = () => {
    const userId = geteuid ? geteuid() : os.userInfo().username;
    const tmpdir = path.join(os.tmpdir(), `tsx-${userId}`);
    const files = fs.readdirSync(tmpdir);
    return files.map((filename) => {
        const content = fs.readFileSync(path.resolve(tmpdir, filename)).toString('utf8');
        const json = JSON.parse(content);
        return json;
    });
};

const getRealSourceFromCache = (entry) => {
    if (!caches) {
        caches = getCaches();
    }

    const item = caches.find((cache) => {
        if (cache.map.mappings === entry.sourceMap.mappings) {
            return true;
        }
    });

    // console.log(item, entry.sourceMap);

    if (item) {
        entry.source = item.code;
        entry.fake = false;
    }

};

module.exports = {

    // logging: 'debug',

    name: 'My TSX Coverage Report',

    reports: 'v8,console-details',

    outputDir: 'docs/tsx',

    assetsPath: '../assets',

    entryFilter: {
        '**/test/specs/**': true
    },

    onEntry: (entry) => {
        // preload hooks does not work without "type=module" in package.json
        // get the source for fake entry from tsx cache
        if (entry.fake && entry.sourceMap) {
            getRealSourceFromCache(entry);
        }
    },

    onEnd: (coverageResults) => {
        checkSnapshot(coverageResults);
    }

};
