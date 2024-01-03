
const platform = 'wind32';

/* v8 ignore next */
if (platform === 'darwin') {
    console.info('hello darwin');
}


/* v8 ignore next 3 */
if (platform === 'linux') {
    console.info('hello linux');
}


const os = platform === 'wind32' ? 'Windows' /* v8 ignore next */ : 'Other';

/* v8 ignore start */
function uncovered(v) {
    console.log(os);
}

/* v8 ignore stop */

const ignore = () => {
    const v = 1;

    /* v8 ignore start */
    uncovered(v);
};


export { ignore };
