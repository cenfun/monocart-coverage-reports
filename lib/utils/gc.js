import v8 from 'node:v8';
import vm from 'node:vm';

const isBun = typeof Bun !== 'undefined' && Boolean(process.versions.bun);

if (typeof global.gc !== 'function') {

    if (isBun) {
        global.gc = () => {
            Bun.gc(true);
        };
    } else {
        v8.setFlagsFromString('--expose_gc');
        global.gc = vm.runInNewContext('gc');
    }
}

const gc = global.gc;

export { gc };
