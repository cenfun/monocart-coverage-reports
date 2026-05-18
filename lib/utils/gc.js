
const isBun = typeof Bun !== 'undefined' && Boolean(process.versions.bun);

if (typeof global.gc !== 'function') {

    if (isBun) {
        global.gc = () => {
            Bun.gc(true);
        };
    } else {
        const v8 = require('node:v8');
        const vm = require('node:vm');
        v8.setFlagsFromString('--expose_gc');
        global.gc = vm.runInNewContext('gc');
    }
}

module.exports = global.gc;
