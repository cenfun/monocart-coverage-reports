import assert from 'node:assert/strict';
import { describe, identity, greet } from './src/subject.ts';
// Load an erasable-only module as well as importing its types.
import './src/types.ts';

export function checkSubject(): void {
    assert.equal(describe(1), 'positive');
    assert.equal(identity<string>('原生 TS 🚀'), '原生 TS 🚀');
    assert.deepEqual(greet({ name: 'Alice' }), { label: 'Alice' });
}
