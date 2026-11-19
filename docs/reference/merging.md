# Merging reports {#merging-reports}

## When to merge reports {#use-cases}

The following usage scenarios may require merging coverage reports:
- When the code is executed in different environments, like Node.js `server side` and browser `client side` (`Next.js` for instance). Each environment may generate its own coverage report. Merging them can give a more comprehensive view of the test coverage.
- When the code is subjected to different kinds of testing. For example, `unit tests` with `Jest` might cover certain parts of the code, while `end-to-end tests` with `Playwright` might cover other parts. Merging these different coverage reports can provide a holistic view of what code has been tested.
- When tests are run on different machines or containers, each might produce its own coverage report. Merging these can give a complete picture of the test coverage across all machines or shards.

V8 combines records with matching report paths and identical source text. Ordinary JS/CSS keep the existing raw-range merge; eligible TS contexts and distinct sourcemaps are separated only when needed. Use `sourcePath` during collection to unify runtime paths from different environments; saved raw runtime paths are not rewritten on import.

## Automatic merging {#automatic-merging}

### Merge during report generation {#merge-during-generation}

- The `MCR` will automatically merge all the added coverage data when executing `generate()`. And it supports adding coverage data asynchronously across processes, see [Multiprocessing Support](/reference/multiprocessing#multiple-processes)
- For `Next.js`, it can actually add coverage data including both server side and client side before executing `generate()`, see example [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)

### Merge with coverage services {#coverage-services}

Codecov supports automatic merging on its service. Configure the `codecov` report to generate `codecov.json`, then upload the files from each test run. See [Codecov](/integrations/coverage-services#codecov) and [merging reports](https://docs.codecov.com/docs/merging-reports).

## Manual merging {#manual-merging}

To combine coverage from separate test runs or machines, export a `raw` report from each run. After collecting all raw directories, pass them through `inputDir` to generate one merged report.

### Review raw artifacts before sharing {#raw-artifact-safety}

**Before uploading raw/debug artifacts (3.2.0+):** `mcr test` also exports `test-results-<id>.json` in raw reports (including ZIP) and retains it in debug caches, even without a hook. Test names, paths and error strings may contain secrets or personal data. Review artifacts and use [`onTestEnd`](/reference/hooks#ontestend) to redact persisted test results before publication; this does not redact terminal output or temporary files already written. Raw imports merge coverage only, not test results.

### Export unit-test coverage {#unit-test-coverage}

Export unit-test coverage to `./coverage-reports/unit/raw`. Examples:

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

### Export end-to-end coverage {#e2e-coverage}

Export end-to-end coverage to `./coverage-reports/e2e/raw`. Examples:

- `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter) with the coverage API
- `Playwright` + `MCR`: [playwright-coverage](https://github.com/cenfun/playwright-coverage)
- More [Integration Examples](/integrations/frameworks-and-tools#frameworks-and-tools)

### Create the merge script {#merge-script}

Create `merge-coverage.js` and use `inputDir` to load the raw coverage directories. Check the result of `generate()` so missing coverage cannot silently pass in CI.

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
const coverageResults = await new CoverageReport(coverageOptions).generate();
if (!coverageResults) {
    throw new Error('No coverage report was generated');
}
```

### Run the merge after all tests {#run-merge}

Run `node path/to/merge-coverage.js` after all tests have completed and their raw data has been collected. For example:

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
See the complete [merge-code-coverage example](https://github.com/cenfun/merge-code-coverage).
