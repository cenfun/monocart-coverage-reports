let collect;

const createGC = () => {
    const v8 = process.getBuiltinModule('v8');
    const vm = process.getBuiltinModule('vm');
    // The host may have replaced global.gc while leaving the flag enabled.
    const existing = vm.runInNewContext('typeof gc === "function" ? gc : null');
    if (existing) {
        return existing;
    }
    v8.setFlagsFromString('--expose_gc');
    try {
        return vm.runInNewContext('gc');
    } finally {
        v8.setFlagsFromString('--no-expose_gc');
    }
};

// Importing MCR must not change V8 flags or install globals in the host process.
const gc = () => {
    if (typeof globalThis.gc === 'function') {
        return globalThis.gc();
    }
    if (!collect) {
        if (typeof Bun !== 'undefined' && process.versions.bun) {
            collect = () => Bun.gc(true);
        } else {
            collect = createGC();
        }
    }
    return collect();
};

export { gc };
