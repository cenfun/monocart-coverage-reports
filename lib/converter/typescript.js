import { stripTypeScriptTypes } from 'node:module';

// Inspect the execution URL before sourcePath: report paths can be rewritten.
const typeScriptExtension = /\.[cm]?ts(?:$|[?#])/i;
const isNativeTypeScript = (item) => !item.empty && item.nativeTypeScript === true;
const isTypeScriptFile = (item) => isNativeTypeScript(item) || typeScriptExtension.test(item.url || item.sourcePath);

const isTypeScriptCandidate = (item) => {
    if (item.fake || item.type === 'css' || item.typeScriptTransformed) {
        return false;
    }
    if ((item.sourceMap || item.sourceCacheId) && !isNativeTypeScript(item)) {
        return false;
    }
    return isTypeScriptFile(item);
};

// Keep the legacy range pipeline unless native facts or an explicit TS policy
// require per-file analysis. Mapped/transformed JS is never opted in by its URL.
const hasTypeScriptContext = (item, option) => Boolean(option || item.nativeTypeScript || item.nativeTypeScriptContext) && isTypeScriptCandidate(item);

const requireSync = (value) => {
    if (value && typeof value.then === 'function') {
        // Reject async options without leaving a rejected user Promise unhandled.
        Promise.resolve(value).catch(() => {});
        throw new TypeError('typescript options and callbacks must be synchronous');
    }
    return value;
};

const readEnabled = (input, allowCallback) => {
    const enabled = requireSync(input);
    if (typeof enabled === 'undefined' || typeof enabled === 'boolean') {
        return enabled;
    }
    if (allowCallback && typeof enabled === 'function') {
        return enabled;
    }
    throw new TypeError('typescript.enabled must be a boolean or a synchronous file callback; callback results must contain a final boolean or omit enabled');
};

const requireOptionsObject = (value) => {
    if (!value || typeof value !== 'object') {
        throw new TypeError('typescript must be null, a boolean, a plain options object or a synchronous file callback');
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError('typescript options must be a plain object');
    }
    for (const key of Object.keys(value)) {
        if (key !== 'enabled') {
            throw new TypeError(`Unknown typescript option: ${key}`);
        }
    }
};

const readOptions = (input, allowCallback) => {
    const value = requireSync(input);
    if (value === null || typeof value === 'undefined') {
        return;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    requireOptionsObject(value);
    return readEnabled(value.enabled, allowCallback);
};

const getFileInfo = (item) => Object.freeze({
    url: item.url || '',
    sourcePath: item.sourcePath || item.url || '',
    nativeTypeScript: isNativeTypeScript(item),
    empty: item.empty === true
});

const invokeEnabled = (callback, info) => {
    const value = requireSync(callback(info));
    if (typeof value !== 'boolean') {
        throw new TypeError(`typescript.enabled callback must return a boolean for ${info.sourcePath}`);
    }
    return value;
};

const resolveDecision = (enabled, item) => {
    if (typeof enabled === 'boolean') {
        return {
            enabled, strict: enabled
        };
    }
    return {
        enabled: isNativeTypeScript(item) || (item.empty === true && item.nativeTypeScriptContext === true),
        strict: isNativeTypeScript(item)
    };
};

const createTypeScriptResolver = (option) => {
    const callback = typeof option === 'function' ? option : null;
    const setting = callback ? null : readOptions(option, true);
    return (item) => {
        if (!isTypeScriptCandidate(item)) {
            return {
                enabled: false, strict: false
            };
        }
        const info = getFileInfo(item);
        // The two callback forms are alternatives. A top-level callback returns
        // final options; returning another callback is deliberately unsupported.
        const value = callback ? readOptions(callback(info), false) : setting;
        const enabled = typeof value === 'function' ? invokeEnabled(value, info) : value;
        return resolveDecision(enabled, item);
    };
};

const defaultTypeScriptResolver = createTypeScriptResolver();

// Acorn only accepts a shebang at offset zero. Use an equal-length comment
// in the analysis copy when restoring the leading BOM.
const restoreLeadingBOM = (source) => `\uFEFF${source.startsWith('#!') ? `//${source.slice(2)}` : source}`;

const getJsSource = (item) => {
    const { source } = item;
    try {
        // Do not transform: generated code would invalidate V8's offsets.
        // The original TS remains in item.source for display, caches and raw reports.
        const stripped = stripTypeScriptTypes(source, {
            mode: 'strip'
        });
        // Node removes a leading BOM before execution. Restore it for original
        // source coordinates, and move V8 ranges by the same UTF-16 offset.
        const offset = source.startsWith('\uFEFF') ? 1 : 0;
        const analysisSource = offset ? restoreLeadingBOM(stripped) : stripped;
        if (analysisSource.length !== source.length) {
            throw new Error('Type stripping did not preserve source offsets');
        }
        return {
            source: analysisSource, offset: item.empty ? 0 : offset
        };
    } catch (cause) {
        throw new Error(`Cannot analyze TypeScript in ${item.sourcePath || item.url}: ${cause.message}. Use Node.js erasable syntax, or provide transformed JavaScript with a sourcemap.`, {
            cause
        });
    }
};

export {
    createTypeScriptResolver, defaultTypeScriptResolver, getJsSource, isNativeTypeScript, isTypeScriptFile, hasTypeScriptContext
};
