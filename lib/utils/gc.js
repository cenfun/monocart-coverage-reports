const v8 = require('node:v8');
const vm = require('node:vm');

if (typeof global.gc !== 'function') {
    v8.setFlagsFromString('--expose_gc');
    global.gc = vm.runInNewContext('gc');
}

module.exports = global.gc;
