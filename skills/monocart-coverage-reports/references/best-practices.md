# MCR best practices: test code and get useful coverage

Use this module to choose a test setup and implement coverage collection. These recipes target **MCR 3.x and Node.js >= 22.15.0**. Reuse the host package manager, module format, test server, and installed tools. Do not upgrade dependencies or migrate an existing runner without approval.

## 1. Choose the simplest collection path

| Target | Default recommendation | Why |
| --- | --- | --- |
| New Node.js tests | **Node.js native test runner + `mcr test`** | Built-in assertions/tests, automatic native V8 JS coverage, no instrumentation or custom collector. |
| Browser tests | **Playwright Test + MCR** | Runner-managed lifecycle and assertions; direct control over JS/CSS coverage reports. |
| Browser tests with integrated reporting | **Playwright Test + monocart-reporter** | Already integrates MCR; combines test results and coverage reporting. |
| Existing Jest/Vitest/Mocha/etc. | Keep the existing runner and its compatible collection integration | Adding coverage should not require rewriting working tests. |

MCR collects/processes coverage and generates reports; the test runner executes assertions. Prefer native V8 collection where supported. Choose **one owner** for collection and final generation, rather than collecting the same execution through multiple integrations.

## 2. Node.js: prefer `mcr test <targets>`

Write tests with `node:test` and `node:assert/strict`. Cover meaningful outputs, errors, boundaries, and asynchronous behavior; use the real module rather than duplicating its implementation in a test. See the [complete module and test example](../SKILL.md#quick-start-test-your-code-and-get-coverage-3x).

Install only if needed, using the host package manager:

```sh
npm install --save-dev monocart-coverage-reports@^3
npx mcr test "./test/**/*.test.mjs" -r v8,console-summary
```

Replace the glob with actual test targets. For a repeatable project command, put `mcr test -c mcr.config.mjs` in an npm script such as `test:coverage`, with this config:

```js
// mcr.config.mjs
export default {
    test: ['./test/**/*.test.mjs'],
    outputDir: './coverage-reports/node',
    reports: ['v8', 'console-summary'],
    outputFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    }
};
```

This example selects final `src/` paths. Adapt it to the host's real source layout and verify the resulting file list; do not copy a filter that excludes the code under test. See [filtering and sourcemaps](filtering-and-sourcemaps.md) for early input filtering, transpiled sources, and `all` for files never loaded by tests.

- `mcr test` invokes Node's native `--test`, automatically collects V8 JS coverage, and generates the selected reports. No manual `NODE_V8_COVERAGE`, coverage instrumentation, or API collector is needed.
- Quote target globs. Forward Node runner flags after `--`, for example `npx mcr test "./test/**/*.test.mjs" -- --test-reporter=spec`.
- Supply actual targets or config `test`; an empty target list skips testing and reporting.
- Open `coverage-reports/index.html` for the first command, or `coverage-reports/node/index.html` for the config above. Verify expected sources and use uncovered branches to choose the next tests.
- Failed tests still attempt report generation and remain failures. Do not suppress the exit status because an HTML file exists.
- Existing runners may use `mcr -c mcr.config.mjs -- npm run test:unit` for Node V8 collection where compatible; avoid duplicate coverage providers. TypeScript needs the host's supported loader/build and matching sourcemaps, not an assumption that every TS syntax runs directly.

See [CLI details](cli.md) for target overrides, configuration discovery, and argument boundaries.

## 3. Browser: Playwright Test + MCR

Run tests with **`playwright test`**, not `mcr test`. Wrapping Playwright's Node runner with the MCR CLI does **not** collect JavaScript executing inside browser pages.

Use an automatic test-scoped fixture: start coverage before navigation, run real assertions, then stop and persist coverage before Playwright closes the page. This includes normal assertion failures. Generate once in the coordinator after every worker has finished writing.

### Complete project example

[playwright-coverage](https://github.com/cenfun/playwright-coverage) is a minimal **Playwright Test + MCR 3.x** example using plain JavaScript ESM. It tests browser-side application code, not the Playwright test scripts or a Node.js backend. Its [quick start](https://github.com/cenfun/playwright-coverage#quick-start-for-your-own-project) explains how to adapt these five files to your application:

| File | Purpose |
| --- | --- |
| [fixtures.js](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.js) | Automatically start/stop page JS/CSS coverage and persist it with `add()`, including ordinary assertion failures. |
| [mcr.config.js](https://github.com/cenfun/playwright-coverage/blob/main/mcr.config.js) | Share output/report options and keep `cleanCache: false` for workers. |
| [global.setup.js](https://github.com/cenfun/playwright-coverage/blob/main/global.setup.js) | Clear the dedicated output directory before workers start. |
| [global-teardown.js](https://github.com/cenfun/playwright-coverage/blob/main/global-teardown.js) | Generate once after all workers finish; reject missing/empty results. |
| [playwright.config.js](https://github.com/cenfun/playwright-coverage/blob/main/playwright.config.js) | Select Chromium, register hooks, and configure the test runner. |

For an existing application, merge these settings, configure its actual `baseURL` and server lifecycle, and import the extended `test` from the fixture. Do not change the application's module system just for coverage; use `.mjs` as below when appropriate. Browser dependencies and binaries must already be installed or their installation approved.

The example's [Todo tests](https://github.com/cenfun/playwright-coverage/blob/main/tests/demo-todo-app.spec.js) serve real local HTML/JS/CSS through Playwright routes so the tests need no server or external website. They assert item creation, input clearing, whitespace handling, and text rendering. The routes and Todo assets are only an offline demo, not extra infrastructure to copy into your application.

Run `npm test` in the example project. Inspect `coverage-reports/index.html` for code coverage, `coverage-reports/lcov.info` for CI, and `playwright-report/index.html` for test results. These are different artifacts: a passing test report alone does not validate coverage. For JS-only coverage, omit CSS collection; retain sourcemaps and select your real application source scope for bundled code.

### Minimal parallel-safe integration

This example assumes `@playwright/test` and MCR 3.x are installed, an approved Chromium binary is available, and the application server is already running. Reuse the host's server lifecycle/readiness checks (such as Playwright `webServer`); do not silently download browsers. Save these files at the host project root except the spec under `e2e/`. Merge the settings into an existing Playwright config rather than replacing its projects or hooks.

```js
// coverage-options.mjs
export default {
    outputDir: './coverage-reports/browser',
    reports: ['v8', 'console-summary'],
    // Workers share this cache. Only the coordinator may clean it.
    cleanCache: false
};
```

```js
// coverage-setup.mjs
import fs from 'node:fs';
import options from './coverage-options.mjs';

export default function globalSetup() {
    // Dedicated to this run: never share with another active Playwright invocation.
    // Remove old reports as well as cache, so missing collection cannot leave stale artifacts.
    fs.rmSync(options.outputDir, { recursive: true, force: true });
}
```

```js
// coverage-fixtures.mjs
import { test as base, expect } from '@playwright/test';
import { MCR } from 'monocart-coverage-reports';
import options from './coverage-options.mjs';

export const test = base.extend({
    coverage: [async ({ page, browserName }, use) => {
        if (browserName !== 'chromium') {
            // Other browser projects still run tests, but do not provide native coverage.
            await use();
            return;
        }
        await Promise.all([
            page.coverage.startJSCoverage({ resetOnNavigation: false }),
            page.coverage.startCSSCoverage({ resetOnNavigation: false })
        ]);
        try {
            await use();
        } finally {
            const [js, css] = await Promise.all([
                page.coverage.stopJSCoverage(),
                page.coverage.stopCSSCoverage()
            ]);
            await MCR(options).add([...js, ...css]);
        }
    }, { auto: true }]
});
export { expect };
```

```js
// coverage-teardown.mjs
import { MCR } from 'monocart-coverage-reports';
import options from './coverage-options.mjs';

export default async function globalTeardown() {
    const results = await MCR(options).generate();
    if (!results || !results.files.length) {
        throw new Error('No browser coverage generated: check fixtures and source scope');
    }
}
```

```js
// playwright.config.mjs
import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    globalSetup: './coverage-setup.mjs',
    globalTeardown: './coverage-teardown.mjs',
    use: {
        browserName: 'chromium',
        baseURL: process.env.APP_URL || 'http://localhost:3000'
    }
});
```

```js
// e2e/counter.spec.mjs
import { test, expect } from '../coverage-fixtures.mjs';

// Assumes a counter starting at 0; replace with your application's actual behavior.
test('increments the counter when clicked', async ({ page }) => {
    await page.goto('/');
    const counter = page.getByTestId('counter');
    await expect(counter).toHaveText('0');
    await page.getByRole('button', { name: 'Increment', exact: true }).click();
    await expect(counter).toHaveText('1');
});
```

```sh
npx playwright test
```

All covered specs must import the extended `test` from the fixture, not directly from `@playwright/test`. Inspect `coverage-reports/browser/index.html`. The example deliberately starts without a source filter: inspect actual bundle URLs and mapped paths, then select application sources using [filtering and sourcemaps](filtering-and-sourcemaps.md). Leaving vendor/runtime code in the report is not an accurate application coverage scope.

### Lifecycle and scope limitations

- Native `page.coverage` JS/CSS collection is **Chromium-only**. Firefox/WebKit require a separate instrumentation-based approach, such as collecting an Istanbul map; changing the reporter does not remove this limitation.
- `resetOnNavigation: false` preserves coverage across navigations in the same page. The fixture covers only its `page`; extra pages/popups, workers, and the Node.js backend require explicit collection strategies. Tests must not close the covered page before fixture teardown.
- Assertion failures normally run fixture teardown; crashes, forced termination, or timeouts may prevent collection. Retain the original failure and report collection failures rather than claiming coverage is complete.
- Only the coordinator removes the dedicated output directory before workers start. Clearing only `.cache` would leave old HTML reports available for upload if collection fails. Never point `outputDir` at source code, merge inputs, or another run's output.
- Do not call `generate()` or `cleanCache()` in each test/worker. `add()` persists data; the coordinator merges it during final generation. `cleanCache: true` in a shared worker would erase other tests' inputs.
- Give independent CI runs/shards separate output directories. Export `raw` per shard and merge only after validating every expected shard; do not let independent global teardowns race on shared cache. See [reports and CI](reports-and-ci.md).

## 4. Browser alternative: Playwright Test + monocart-reporter

Choose this when you also want Monocart's Playwright test report, rather than maintaining a separate MCR reporting lifecycle. **monocart-reporter already integrates MCR**; do not add another MCR generator for the same data.

1. Check the installed reporter's version, runtime requirements, bundled MCR version, and [official code coverage integration](https://github.com/cenfun/monocart-reporter#code-coverage-report). Do not assume its bundled MCR major matches a separate top-level installation or pass unsupported MCR 3.x options.
2. Add `monocart-reporter` to the host's Playwright `reporter` configuration and configure its `coverage` options according to that release's documentation.
3. Use an automatic Playwright fixture to start/stop page coverage around each test, as above, but submit the data through the reporter's documented coverage API with the current `testInfo`, instead of `MCR(options).add()`.
4. Let the reporter own aggregation, cleanup, and final report generation. Do **not** also install the direct-MCR global setup/teardown above. Follow the reporter's own merge workflow for parallel jobs/shards.
5. Run `npx playwright test` and verify both the test report and its coverage report contain current, intended data. Enabling a reporter alone does not start browser coverage collection.

Use the version-matched official fixture rather than guessing reporter API signatures. Direct MCR is preferable when you need independent coverage lifecycle/options; the reporter is preferable when you want unified test and coverage reporting. Both use the same browser coverage limitations.

## 5. Make coverage trustworthy

- **Test behavior, not a percentage.** Add assertions for normal, boundary, error, and async paths. Use uncovered branches to find missing cases; do not weaken assertions or add unjustified ignores to satisfy a threshold.
- **Match the exact build.** Keep tested source, bundle, and sourcemaps together. For TS/bundlers, verify mapped source and line positions; do not rebuild different artifacts before generating/merging coverage.
- **Define the denominator.** Exclude only justified out-of-scope dependencies/generated assets, and use `all` when untouched application files must count as uncovered. A high percentage of loaded files alone does not prove the whole application is tested.
- **Choose useful artifacts.** Start with `v8` and `console-summary`; add `lcovonly` for compatible CI services, `v8-json` for machine validation, or `raw` for later merging. Do not merge HTML, summaries, or percentages.
- **Fail honestly.** Test, collection, report, and threshold failures must remain nonzero. `watermarks` only colors results; enforce thresholds explicitly. API callers must reject missing/empty results; CI must reject stale artifacts, not just check whether an old HTML file exists. See [strict CI and threshold recipes](reports-and-ci.md).
- **Keep artifacts safe.** Use dedicated per-run output directories and retain useful reports on failures without masking status. Reports and raw/debug data may contain source code, private paths, and URLs; publish only with approval.

### Delivery checklist

- [ ] The chosen runner executes real assertions; collection starts before application execution/navigation.
- [ ] The report contains the intended current sources, accurate mappings, and any required untested files.
- [ ] Parallel tests do not clear one another's data; every required shard contributes to the merge.
- [ ] Reports are fresh and nonempty, and test/report/threshold failure paths fail CI.
- [ ] The user receives the run command, report location, source scope, and any collection limitations.
