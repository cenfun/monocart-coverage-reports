# Merging reports {#merging-reports}

## When to merge reports {#use-cases}

Merge coverage when no single run or environment captures everything you want to see in one report:

- **Server and browser:** A Next.js app can produce separate coverage data for code that runs on the Node.js server and code that runs in the browser. Merge them to see what the tests covered on both sides. See the [Next.js and Playwright example](#merge-during-generation).
- **Unit and end-to-end tests:** Jest unit tests and Playwright end-to-end tests may exercise different parts of the same application. Merge their coverage to see what the two suites cover together. See the [manual merge example](#manual-merging).
- **CI shards:** Each shard runs only part of the test suite. Merge coverage from all shards to see what the full suite covered.

Choose the merge method based on how the data was collected:

- **One report instance or a shared cache:** Call [`generate()` once](#merge-during-generation) after all collection finishes.
- **Independent runs or separate machines:** [Export `raw` reports and import them together](#manual-merging).
- **Only need a summary in your coverage service:** [Upload reports separately](#coverage-services) if the service can merge them.

For local merges with MCR, use one input format (V8 or Istanbul) across runs. For path normalization and the `sourcePath` option, see [Source paths](/pages/source-path).

::: info Related guides
If all your workers can share a cache, follow [Multiple processes](./multiprocessing#workflow) to collect in parallel and generate one report after all writes finish.
:::

## Automatic merging {#automatic-merging}

### Merge during report generation {#merge-during-generation}

- The `MCR` will automatically merge all the added coverage data when executing `generate()`. And it supports adding coverage data asynchronously across processes, see [Multiprocessing Support](/pages/multiprocessing#multiple-processes)
- For `Next.js`, it can actually add coverage data including both server side and client side before executing `generate()`, see example [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)

### Merge with coverage services {#coverage-services}

Codecov supports automatic merging on its service. Configure the `codecov` report to generate `codecov.json`, then upload the files from each test run. See [Codecov](/pages/coverage-services#codecov) and [merging reports](https://docs.codecov.com/docs/merging-reports).

## Manual merging {#manual-merging}

To combine coverage from separate test runs or machines, export a `raw` report from each run. After collecting all raw directories, pass them through `inputDir` to generate one merged report. The example below assumes both test runs collect V8 coverage.

### Review raw artifacts before sharing {#raw-artifact-safety}

**Before uploading raw/debug artifacts (3.2.0+):** `mcr test` also exports `test-results-<id>.json` in raw reports (including ZIP) and retains it in debug caches, even without a hook. Test names, paths and error strings may contain secrets or personal data. Review artifacts and use [`onTestEnd`](/pages/hooks#ontestend) to redact persisted test results before publication; this does not redact terminal output or temporary files already written. Raw imports merge coverage only, not test results.

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

Reuse the [`raw` report configuration above](#unit-test-coverage) for the Playwright run, but set the top-level `outputDir` to `./coverage-reports/e2e` and keep the `raw` report's `outputDir` as `raw`. This exports coverage to `./coverage-reports/e2e/raw`. Examples:

- `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter) with the coverage API
- `Playwright` + `MCR`: [playwright-coverage](https://github.com/cenfun/playwright-coverage)
- More [Integration Examples](/pages/frameworks-and-tools#frameworks-and-tools)

### Create the merge script {#merge-script}

Create `merge-coverage.js` and list both raw coverage directories in `inputDir`.

```js
// merge-coverage.js
import { CoverageReport } from 'monocart-coverage-reports';

const coverageResults = await new CoverageReport({
    inputDir: [
        './coverage-reports/unit/raw',
        './coverage-reports/e2e/raw'
    ],
    outputDir: './coverage-reports/merged',
    reports: ['v8', 'console-details']
}).generate();

if (!coverageResults) {
    throw new Error('No coverage report was generated');
}
```

In CI, make sure both runs produced raw coverage before merging. MCR skips missing input directories, so a report can be generated even if one run is missing.

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
