import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { describe, identity, greet } from './src/subject.ts';
import typescript from './src/typescript.ts';
// Execute a type-only module as well as importing its types.
import './src/types.ts';

export function checkSubject(): void {
    assert.equal(describe(1), 'positive');
    assert.equal(identity<string>('原生 TS 🚀'), '原生 TS 🚀');
    assert.deepEqual(greet({ name: 'Alice' }), { label: 'Alice' });
}

export function checkTypeScript(): void {
    const point = { x: 3, y: 4 };
    const log = mock.method(console, 'log', () => {});
    try {
        assert.equal(typescript(point, 'native TS'), undefined);
        assert.deepEqual(log.mock.calls.map((call) => call.arguments), [
            [point, { x: 1, y: 2 }, 'hello world'],
            [point, 'native TS', 'hello world']
        ]);
    } finally {
        log.mock.restore();
    }
}
