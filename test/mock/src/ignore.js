const platform = 'wind32';

/* v8 ignore next */
if (platform === 'darwin') {
    console.info('hello darwin');
    // v8 ignore next
}

/* v8 ignore next 3 */
if (platform === 'linux') {
    console.info('hello linux');
}

const os = platform === 'wind32' ? 'Windows' /* v8 ignore next */ : 'Other';

/* v8 ignore start */ function uncovered(v) {
    console.log(os);
}/* v8 ignore stop */


const ignore = /* v8 ignore start */ () => {
    const v = 1;
    uncovered(v);
};

/* v8 ignore stop */

export { ignore };

