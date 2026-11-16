# Merging reports {#merge-coverage-reports}
The following usage scenarios may require merging coverage reports:
- When the code is executed in different environments, like Node.js `server side` and browser `client side` (`Next.js` for instance). Each environment may generate its own coverage report. Merging them can give a more comprehensive view of the test coverage.
- When the code is subjected to different kinds of testing. For example, `unit tests` with `Jest` might cover certain parts of the code, while `end-to-end tests` with `Playwright` might cover other parts. Merging these different coverage reports can provide a holistic view of what code has been tested.
- When tests are run on different machines or containers, each might produce its own coverage report. Merging these can give a complete picture of the test coverage across all machines or shards.

## Automatic Merging {#automatic-merging}
- The `MCR` will automatically merge all the added coverage data when executing `generate()`. And it supports adding coverage data asynchronously across processes, see [Multiprocessing Support](/guide/multiprocessing#multiprocessing-support)
- For `Next.js`, it can actually add coverage data including both server side and client side before executing `generate()`, see example [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
- Using `Codecov`, a popular online code coverage service, which supports automatic merging of reports. Please use report `codecov`, it will generate report file `codecov.json`. If multiple `codecov.json` files are generated, upload all these files, they will be automatically merged. see [Codecov](/integrations/examples#codecov) and [merging reports](https://docs.codecov.com/docs/merging-reports)

## Manual Merging {#manual-merging}
If the reports cannot be merged automatically, then here is how to manually merge the reports.
First, using the `raw` report to export the original coverage data to the specified directory.

**Before uploading raw/debug artifacts (3.2.0+):** `mcr test` also exports `test-results-<id>.json` in raw reports (including ZIP) and retains it in debug caches, even without a hook. Test names, paths and error strings may contain secrets or personal data. Review artifacts and use [`onTestEnd`](/reference/hooks#ontestend--mcr-test-only) to redact persisted test results before publication; this does not redact terminal output or temporary files already written. Raw imports merge coverage only, not test results.

- For example, we have `raw` coverage data from `unit test`, which is output to `./coverage-reports/unit/raw`. Unit test examples:
    - `Jest` + [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage)
    - `Vitest` + [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage)
```js
const coverageOptions = {
    name: 'My Unit Test Coverage Report',
    outputDir: './coverage-reports/unit',
    reports: [
        ['raw', {
            // relative path will be "./coverage-reports/unit/raw"
            // defaults to raw
            outputDir: 'raw'
        }],
        ['v8'],
        ['console-details']
    ]
};
```

- We also have `raw` coverage data from `e2e test`, which is output to `./coverage-reports/e2e/raw`. E2E test examples:
    - `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter) with coverage API
    - `Playwright` + `MCR`, see [playwright-coverage](https://github.com/cenfun/playwright-coverage)
    - see more [Integration Examples](/integrations/examples#integration-examples)

- Then create a script `merge-coverage.js` to generate a merged report with option `inputDir`.
```js
// merge-coverage.js
import fs from 'fs';
import { CoverageReport } from 'monocart-coverage-reports';
const inputDir = [
    './coverage-reports/unit/raw',
    './coverage-reports/e2e/raw'
];
const coverageOptions = {
    name: 'My Merged Coverage Report',
    inputDir,
    outputDir: './coverage-reports/merged',

    // filter for both unit and e2e
    entryFilter: {
        '**/node_modules/**': false,
        '**/*': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    },

    sourcePath: (filePath, info) => {
        // Unify the file path for the same files
        // For example, the file index.js has different paths:
        // unit: unit-dist/src/index.js
        // e2e: e2e-dist/src/index.js
        // return filePath.replace("unit-dist/", "").replace("e2e-dist/", "")
        return filePath;
    },

    reports: [
        ['v8'],
        ['console-details']
    ],

    onEnd: () => {
        // remove the raw files if no longer needed
        // inputDir.forEach((p) => {
        //     fs.rmSync(p, {
        //         recursive: true,
        //         force: true
        //     });
        // });
    }
};
await new CoverageReport(coverageOptions).generate();
```
- Running script `node path/to/merge-coverage.js` after all the tests are completed. All the command scripts are probably like following:
```json
{
    "scripts": {
        "test:unit": "jest",
        "test:e2e": "playwright test",
        "merge-coverage": "node path/to/merge-coverage.js",
        "test": "npm run test:unit && npm run test:e2e && npm run merge-coverage"
    }
}
```
see example: [merge-code-coverage](https://github.com/cenfun/merge-code-coverage)
