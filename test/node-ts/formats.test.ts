import { test } from 'node:test';
import { checkFormats } from './format-assertions.ts';

test('native .mts and .cts modules', checkFormats);
