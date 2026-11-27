import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import hash from '../../src/app/core/hash.js';

const reportUrl = 'https://example.test/reports/v8/index.html?theme=dark';

const mockBrowser = (t, fragment) => {
    const location = new URL(`${reportUrl}${fragment}`);
    const state = {
        report: true
    };
    const pushState = t.mock.fn((nextState, title, url) => {
        assert.equal(location.hash, fragment, 'does not navigate to the empty fragment first');
        assert.equal(nextState, state);
        assert.equal(title, '');
        location.href = url;
    });
    const globals = {
        location,
        history: {
            state, pushState
        }
    };
    for (const [key, value] of Object.entries(globals)) {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, {
            configurable: true, value
        });
        t.after(() => {
            if (descriptor) {
                Object.defineProperty(globalThis, key, descriptor);
            } else {
                delete globalThis[key];
            }
        });
    }
    return {
        location, pushState
    };
};

describe('report hash removal', () => {
    it('clears the last parameter through history without fragment navigation', (t) => {
        const { location, pushState } = mockBrowser(t, '#page=async.js');
        hash.remove('page');
        assert.equal(location.href, reportUrl);
        assert.equal(pushState.mock.callCount(), 1);
        hash.remove('page');
        assert.equal(pushState.mock.callCount(), 1);
    });

    it('leaves other parameters intact and skips keys that are already absent', (t) => {
        const { location, pushState } = mockBrowser(t, '#page=async.js&mode=source');
        hash.remove(['page', 'other']);
        assert.equal(location.hash, '#mode=source');
        hash.remove('page');
        assert.equal(location.hash, '#mode=source');
        assert.equal(pushState.mock.callCount(), 0);
    });

    it('preserves remaining parameters in browsers without URLSearchParams.size', (t) => {
        t.mock.getter(URLSearchParams.prototype, 'size', () => void 0);
        const { location, pushState } = mockBrowser(t, '#page=async.js&mode=source');
        hash.remove('page');
        assert.equal(location.hash, '#mode=source');
        assert.equal(pushState.mock.callCount(), 0);
    });

    it('clears all parameters through history when called without a key', (t) => {
        const { location, pushState } = mockBrowser(t, '#page=async.js&mode=source');
        hash.remove();
        assert.equal(location.href, reportUrl);
        assert.equal(pushState.mock.callCount(), 1);
    });
});
