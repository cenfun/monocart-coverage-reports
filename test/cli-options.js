module.exports = {

    // logging: 'debug',

    entryFilter: (entry) => {
        return entry.url.includes('mock/node');
    },

    onEnd: () => {
        console.log('test cli end');
    }

};
