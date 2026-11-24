import assert from 'node:assert/strict';
import { magnitude } from './src/module.mts';
import { createRequire } from 'node:module';

const common = createRequire(import.meta.url)('./src/common.cts') as {
    select(value: boolean): string;
};

export function checkFormats(): void {
    assert.equal(magnitude(-2), 2);
    assert.equal(common.select(true), 'yes');
}
