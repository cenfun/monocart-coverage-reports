module.exports = {

    entryFilter: (entry) => {
        return entry.url.includes('mock/node');
    },

    onEnd: () => {
        console.log('test cli end');
    }

};
