// repro.mjs — run with: npx mcr node test/repro.mjs
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['-e', "console.log('hello from child')"], {
    cwd: '/',
    stdio: 'inherit'
});
