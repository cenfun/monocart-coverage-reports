require('./v8-ignore-next.js');
require('./v8-ignore-return.js');
require('./v8-ignore-start-stop.js');
require('./node-coverage.js');

const platform = 'wind32';

/* v8 ignore next */
if (platform === 'darwin') {
    console.log('hello darwin');
// v8 ignore next
}

/* v8 ignore next 3 */
if (platform === 'linux') {
    console.log('hello linux');
}


const os = platform === 'wind32' ? 'Windows' /* v8 ignore next */ : 'Other';

/* v8 ignore start */ function uncovered(v) {
    console.log(os);
}/* v8 ignore stop */


const neverMind = /* v8 ignore start */ () => {
    uncovered();
};

/* v8 ignore stop */

const ignore = (v) => {
    if (v) {
        neverMind();
    }
};

module.exports = {
    ignore,
    neverMind,
    uncovered,
    os,
    platform
};

