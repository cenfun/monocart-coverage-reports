import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTypeScriptResolver } from '../../lib/converter/typescript.js';
import { defaultOptions } from '../../lib/default/options.js';

const native = {
    type: 'js', url: 'file:///src/native.ts', sourcePath: 'src/native.ts', nativeTypeScript: true
};
const unknown = {
    type: 'js', url: 'file:///src/unknown.ts', sourcePath: 'src/unknown.ts'
};
const empty = {
    ... unknown, empty: true, nativeTypeScriptContext: true
};
const skipped = [
    {
        ... unknown, url: 'file:///app.js'
    },
    {
        ... unknown, sourceMap: {}
    },
    {
        ... native, fake: true
    },
    {
        ... unknown, typeScriptTransformed: true
    },
    {
        ... unknown, type: 'css'
    }
];

describe('TypeScript option resolution', () => {
    it('defaults to null and auto only uses confirmed identity or a recorded untested context', () => {
        assert.equal(defaultOptions.typescript, null);
        for (const option of [null, void 0, {}, {
            enabled: void 0
        }]) {
            const resolve = createTypeScriptResolver(option);
            assert.equal(resolve(native).enabled, true);
            assert.equal(resolve(unknown).enabled, false);
            assert.equal(resolve(empty).enabled, true);
            assert.equal(resolve({
                ... unknown, empty: true
            }).enabled, false);
        }
    });

    for (const value of [true, false]) {
        it(`supports boolean and object enabled=${value}`, () => {
            for (const option of [value, {
                enabled: value
            }]) {
                const resolve = createTypeScriptResolver(option);
                assert.equal(resolve(native).enabled, value);
                assert.equal(resolve(unknown).enabled, value);
                assert.equal(resolve(empty).enabled, value);
                for (const entry of skipped) {
                    assert.equal(resolve(entry).enabled, false);
                }
            }
        });
    }

    for (const form of ['top-level', 'enabled']) {
        it(`calls the ${form} callback once per candidate with immutable, factual file info`, () => {
            const calls = [];
            const callback = (info) => {
                calls.push(info);
                assert.equal(Object.isFrozen(info), true);
                return info.empty || info.nativeTypeScript;
            };
            const option = form === 'top-level' ? callback : {
                enabled: callback
            };
            const resolve = createTypeScriptResolver(option);
            assert.equal(resolve(native).enabled, true);
            assert.equal(resolve(unknown).enabled, false);
            assert.equal(resolve(empty).enabled, true);
            for (const entry of skipped) {
                assert.equal(resolve(entry).enabled, false);
            }
            assert.deepEqual(calls, [{
                url: native.url, sourcePath: native.sourcePath, nativeTypeScript: true, empty: false
            }, {
                url: unknown.url, sourcePath: unknown.sourcePath, nativeTypeScript: false, empty: false
            }, {
                url: empty.url, sourcePath: empty.sourcePath, nativeTypeScript: false, empty: true
            }]);
            assert.equal(Object.hasOwn(empty, 'nativeTypeScript'), false);
            assert.notEqual(calls[0], native);
            assert.throws(() => {
                calls[0].sourcePath = 'changed';
            }, TypeError);
            assert.equal(native.sourcePath, 'src/native.ts');
        });
    }

    it('supports final object callback results and automatic callback results', () => {
        for (const value of [null, void 0, {}, {
            enabled: void 0
        }]) {
            const resolve = createTypeScriptResolver(() => value);
            assert.equal(resolve(native).enabled, true);
            assert.equal(resolve(unknown).enabled, false);
        }
        const resolve = createTypeScriptResolver((info) => ({
            enabled: info.empty
        }));
        assert.equal(resolve(native).enabled, false);
        assert.equal(resolve({
            ... unknown, empty: true
        }).enabled, true);
    });

    it('does not turn a parsing decision into a native loading fact', () => {
        let info;
        const resolve = createTypeScriptResolver((value) => {
            info = value;
            return true;
        });
        assert.equal(resolve(unknown).enabled, true);
        assert.equal(info.nativeTypeScript, false);
        assert.equal(Object.hasOwn(unknown, 'nativeTypeScript'), false);
        assert.equal(createTypeScriptResolver(false)(native).enabled, false);
        assert.equal(native.nativeTypeScript, true);
    });

    it('does not report untested files as having loaded, even if an old entry reused the identity field', () => {
        let info;
        const resolve = createTypeScriptResolver((value) => {
            info = value;
            return true;
        });
        resolve({
            ... native, empty: true
        });
        assert.equal(info.empty, true);
        assert.equal(info.nativeTypeScript, false);
    });

    const invalid = [
        0,
        'true',
        [],
        new Date(),
        {
            endabled: true
        },
        {
            filter: () => true
        },
        {
            enabled: null
        },
        {
            enabled: 'true'
        },
        {
            enabled: 1
        }
    ];
    for (const [index, option] of invalid.entries()) {
        it(`rejects invalid static option ${index} rather than coercing it`, () => {
            assert.throws(() => createTypeScriptResolver(option), /typescript/);
        });
    }

    it('rejects invalid callback values, callback nesting, and non-boolean enabled callback results', () => {
        const values = [0, 'true', [], () => true, {
            enabled: () => true
        }, {
            enabled: null
        }, {
            endabled: true
        }];
        for (const value of values) {
            assert.throws(() => createTypeScriptResolver(() => value)(native), /typescript/);
        }
        for (const value of [null, void 0, {}, 1, 'false']) {
            assert.throws(() => createTypeScriptResolver({
                enabled: () => value
            })(native), /must return a boolean/);
        }
    });

    it('preserves thrown callback errors', () => {
        const error = new Error('expected callback failure');
        const callback = () => {
            throw error;
        };
        for (const option of [callback, {
            enabled: callback
        }]) {
            assert.throws(() => createTypeScriptResolver(option)(native), (actual) => actual === error);
        }
    });

    it('rejects async options and callbacks without an unhandled rejection', async () => {
        const promise = Promise.reject(new Error('async static options'));
        assert.throws(() => createTypeScriptResolver(promise), /must be synchronous/);
        const enabledPromise = Promise.reject(new Error('async enabled options'));
        assert.throws(() => createTypeScriptResolver({
            enabled: enabledPromise
        }), /must be synchronous/);
        const callbacks = [async () => {
            await Promise.resolve();
            return true;
        }, async () => {
            await Promise.resolve();
            throw new Error('async callback');
        }];
        for (const callback of callbacks) {
            assert.throws(() => createTypeScriptResolver(callback)(native), /must be synchronous/);
            assert.throws(() => createTypeScriptResolver({
                enabled: callback
            })(native), /must be synchronous/);
        }
        await new Promise((resolve) => {
            setImmediate(resolve);
        });
    });
});
