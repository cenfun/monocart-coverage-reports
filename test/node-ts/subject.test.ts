import { test } from 'node:test';
import { checkSubject, checkTypeScript } from './assertions.ts';

test('native TypeScript functions and types', checkSubject);
test('native execution of the compiled TypeScript fixture scenario', checkTypeScript);
