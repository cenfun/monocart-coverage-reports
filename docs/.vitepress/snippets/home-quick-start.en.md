::: code-group

```sh [Node.js]
# From your project root, adjust the glob to match your node:test files.
npx --package=monocart-coverage-reports mcr test "./test/**/*.test.js"
```

```sh [TypeScript]
# Run node:test files that use TypeScript syntax Node.js can strip.
npx --package=monocart-coverage-reports mcr test "./test/**/*.test.ts"
```

```sh [Playwright]
# Run the complete Chromium coverage example in a new directory.
git clone https://github.com/cenfun/playwright-coverage.git
cd playwright-coverage
npm install
npx playwright install chromium
npm test
# Open coverage-reports/index.html.
```

```js [Vitest]
// In an existing Vitest project: npm i -D vitest-monocart-coverage
// Merge this into vitest.config.js, then run: npx vitest run --coverage
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'custom',
            customProviderModule: 'vitest-monocart-coverage'
        }
    }
});
```

```js [Jest]
// In an existing Jest project: npm i -D jest-monocart-coverage
// Merge this into jest.config.mjs, then run: npx jest
export default {
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageReporters: ['none'],
    reporters: [
        'default',
        ['jest-monocart-coverage', {
            reports: ['v8', 'console-summary'],
            outputDir: './coverage-reports/jest'
        }]
    ]
};
```

```text [AI Agent]
Use Monocart Coverage Reports (MCR) 3.x to add or improve coverage in this project.
Check the Node.js version and keep the existing test runner and package manager.
If MCR is installed, read its bundled monocart-coverage-reports skill first.
Run the relevant tests, verify that the report contains the expected source files,
and report the command, report path, and the most important coverage gaps.
Do not weaken assertions, change thresholds, or exclude code to improve the numbers.
```

:::
