# Monocart Coverage Reports

[![npm](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![license](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)
![build](https://img.shields.io/github/actions/workflow/status/cenfun/monocart-coverage-reports/ci.yml)
[![install size](https://packagephobia.com/badge?p=monocart-coverage-reports)](https://packagephobia.com/result?p=monocart-coverage-reports)
[![npm graph](https://img.shields.io/badge/npm-graph-blue)](https://npmgraph.js.org/?q=monocart-coverage-reports)
![dependencies](https://img.shields.io/librariesio/github/cenfun/monocart-coverage-reports)
[![downloads](https://devimg.vercel.app/npm/downloads/monocart-coverage-reports?label={total}%20downloads/month)](https://www.npmjs.com/package/monocart-coverage-reports)

🌐 English | [简体中文](README.zh-Hans.md)

> A JavaScript code coverage tool to generate native [V8](https://v8.dev/blog/javascript-code-coverage) reports or [Istanbul](https://istanbul.js.org/) reports.

* [Usage](#usage)
* [Best Practices](#best-practices)
* [Options](#options)
* [Available Reports](#available-reports)
* [Compare Reports](#compare-reports)
* [Collecting Istanbul Coverage Data](#collecting-istanbul-coverage-data)
* [Collecting V8 Coverage Data](#collecting-v8-coverage-data)
    - [Collecting V8 Coverage Data with Playwright](#collecting-v8-coverage-data-with-playwright)
    - [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)
    - [Collecting V8 Coverage Data from Node.js](#collecting-v8-coverage-data-from-nodejs)
    - [Collecting V8 Coverage Data with `CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)
    - [V8 Coverage Data API](#v8-coverage-data-api)
* [Filtering Results](#filtering-results)
* [Resolve `sourcePath` for the Source Files](#resolve-sourcepath-for-the-source-files)
* [Adding Empty Coverage for Untested Files](#adding-empty-coverage-for-untested-files)
* [Hooks](#hooks)
* [Ignoring Uncovered Codes](#ignoring-uncovered-codes)
* [Multiprocessing Support](#multiprocessing-support)
* [Command Line](#command-line)
* [Config File](#config-file)
* [Run Tests with `mcr test`](#run-tests-with-mcr-test)
* [Merge Coverage Reports](#merge-coverage-reports)
    - [Automatic Merging](#automatic-merging)
    - [Manual Merging](#manual-merging)
* [Common issues](#common-issues)
    - [Unexpected coverage](#unexpected-coverage)
    - [Unparsable source](#unparsable-source)
    - [JavaScript heap out of memory](#javascript-heap-out-of-memory)
* [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
* [Integration with Any Testing Framework](#integration-with-any-testing-framework)
* [Integration Examples](#integration-examples)
    - [Playwright](#playwright)
    - [c8](#c8)
    - [CodeceptJS](#codeceptjs)
    - [VSCode](#vscode)
    - [Jest](#jest)
    - [Vitest](#vitest)
    - [Node Test Runner](#node-test-runner)
    - [Puppeteer](#puppeteer)
    - [Cypress](#cypress)
    - [WebdriverIO](#webdriverio)
    - [Storybook Test Runner](#storybook-test-runner)
    - [TestCafe](#testcafe)
    - [Selenium Webdriver](#selenium-webdriver)
    - [Mocha](#mocha)
    - [TypeScript](#typescript)
    - [AVA](#ava)
    - [Codecov](#codecov)
    - [Codacy](#codacy)
    - [Coveralls](#coveralls)
    - [Sonar Cloud](#sonar-cloud)
* [Contributing](#contributing)
* [Changelog](CHANGELOG.md)
* [Thanks](#thanks)

## Usage
> **MCR 3.x requires [Node.js >= 22.15.0](https://nodejs.org/)** for all APIs and CLI commands, including ordinary commands, `merge` and `test`.

**Upgrading from 2.x:** See the [3.x migration guide](migrate-to-3.md).

- Install
```sh
npm install monocart-coverage-reports
```
- API
```js
import { MCR } from 'monocart-coverage-reports';
const mcr = MCR({
    name: 'My Coverage Report - 2024-02-28',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-details'],
    cleanCache: true
});
await mcr.add(coverageData);
await mcr.generate();
```
Using `import` and load options from [config file](#config-file)
```js
import { CoverageReport } from 'monocart-coverage-reports';
const mcr = new CoverageReport();
await mcr.loadConfig();
```
> Both `MCR({...})` and `new CoverageReport()` create the same instance. `MCR()` is a shorthand factory function; use `new CoverageReport()` when you prefer class instantiation or need to call `loadConfig()` separately.

For more information, see [Multiprocessing Support](#multiprocessing-support)

- CLI
```sh
mcr node my-app.js -r v8,console-details
```
For more information, see [Command Line](#command-line)

## Best Practices

For new test setups, prefer native coverage collection without an instrumentation step:

| Target | Recommended setup | Responsibility |
| --- | --- | --- |
| Node.js | **Node.js native test runner + `mcr test`** | `node:test` runs assertions; MCR automatically collects native V8 JavaScript coverage and generates reports. |
| Browser | **Playwright Test + MCR** | Playwright runs assertions; automatic fixtures collect Chromium JS/CSS coverage; MCR merges it and generates reports. |
| Browser with integrated test reporting | **Playwright Test + [monocart-reporter](https://github.com/cenfun/monocart-reporter#code-coverage-report)** | The reporter already integrates MCR; configure its coverage option and submit coverage from fixtures for unified test and coverage reporting. |

For detailed setup instructions and examples, see the [best-practices guide](skills/monocart-coverage-reports/references/best-practices.md).

## AI Agent Skill

For AI-assisted development in a source checkout, start with [AGENTS.md](https://github.com/cenfun/monocart-coverage-reports/blob/main/AGENTS.md). It describes the source layout, development commands, validation, and safety boundaries. `.github/copilot-instructions.md` provides a self-contained summary of the core rules for GitHub Copilot. These checkout-only guides are not included in the npm package and are separate from the reusable integration skill below.

The reusable [Monocart Coverage Reports skill](skills/monocart-coverage-reports/SKILL.md) helps AI coding agents collect coverage, configure the CLI, debug sourcemaps and filters, merge raw reports, and enforce CI thresholds. It uses a main `SKILL.md` with task-specific references loaded on demand, targeting MCR 3.x only and checking its runtime requirements.

The npm package includes `skills/monocart-coverage-reports/`. Copy this **entire directory**, including `references/`, into your agent's supported skills location, or ask the agent to read `SKILL.md` directly. Installing MCR does not automatically register the skill or modify agent settings. The instructions are in English; requests and responses can use any language.

From the host project root, locate the installed skill and package manifest (older releases may not include the skill):

```sh
node -p "require.resolve('monocart-coverage-reports/skills/monocart-coverage-reports/SKILL.md')"
node -p "require.resolve('monocart-coverage-reports/package.json')"
```

Read the resolved skill, then follow its relative reference links. Use the installed package's runtime, API, and version requirements rather than assuming all examples apply to older releases. These commands resolve files; they do not import Markdown as JavaScript.

## Options
- Default options: [lib/default/options.js](./lib/default/options.js)
- Options declaration see `CoverageReportOptions` [lib/index.d.ts](./lib/index.d.ts)
- [Config file](#config-file)

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `logging` | `"off" \| "error" \| "info" \| "debug"` | `"info"` | Logging level. Use `"debug"` to keep raw cache and dump sourcemaps for troubleshooting. See [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap). |
| `name` | `string` | `"Coverage Report"` | Report title shown in the UI and summary reports. |
| `reports` | `string \| (string \| ReportDescription)[]` | `""` (auto) | Reports to generate. Defaults to `"v8"` for V8 data and `"html"` for Istanbul data. See [Available Reports](#available-reports). |
| `outputDir` | `string` | `"./coverage-reports"` | Output directory for all reports and the `.cache` folder. |
| `inputDir` | `string \| string[]` | `null` | Input directories of raw coverage data for [merging](#merge-coverage-reports). |
| `baseDir` | `string` | `process.cwd()` | Base dir used to normalize relative source paths. Set when the report is generated from a different working directory than the sources. |
| `dataDir` | `string` | `null` | Coverage data directory loaded automatically in `generate()` — alternative to `addFromDir()`. |
| `entryFilter` | `string \| object \| function` | `null` | (V8 only) Filter V8 entries by url. See [Filtering Results](#filtering-results). |
| `sourceFilter` | `string \| object \| function` | `null` | (V8 only) Filter sources unpacked from sourcemaps. |
| `outputFilter` | `string \| object \| function` | `null` | (V8 only) Filter final files by `sourcePath` after sourcemap conversion. See [Filtering Results](#filtering-results). |
| `filter` | `string \| object \| function` | `null` | Combined filter replacing both `entryFilter` and `sourceFilter`. |
| `sourcePath` | `object \| function` | `null` | Rewrite source paths; see [Resolve `sourcePath`](#resolve-sourcepath-for-the-source-files). |
| `all` | `string \| string[] \| object` | `null` | Include untested files as empty coverage. See [Adding Empty Coverage](#adding-empty-coverage-for-untested-files). |
| `outputFile` | `string` | `"index.html"` | (V8 only) Output `[sub dir/]filename` for the V8 report. |
| `inline` | `boolean` | `false` | (V8 only) Inline all assets into a single HTML file. |
| `assetsPath` | `string` | `"./assets"` | (V8 only) Assets directory when `inline` is false. |
| `lcov` | `boolean` | `false` | Also generate `lcov.info` (equivalent to adding the `lcovonly` report). |
| `v8Ignore` | `boolean` | `true` | (V8 only) Enable/disable comment-based ignoring (`v8 ignore …`). See [Ignoring Uncovered Codes](#ignoring-uncovered-codes). |
| `reportPath` | `string \| () => string` | `null` | Override the report entry path (defaults to `outputDir/index.html`). Useful when multiple reports share an `outputDir`. |
| `watermarks` | `[number, number] \| object` | `[50, 80]` | Low/high thresholds (percent). Accepts per-metric object like `{ bytes:[50,80], lines:[50,80] }`. |
| `clean` | `boolean` | `true` | Clean previous reports in `outputDir` before generating (the `.cache` dir is preserved unless `cleanCache` is also `true`). |
| `cleanCache` | `boolean` | `false` | Clean the cache dir on start. When both `clean` and `cleanCache` are `false`, cached coverage data from previous runs is preserved and can be reused across processes. |
| `gc` | `number` | `null` | Memory threshold in MB; force GC at critical stages when JavaScript heap usage (`heapUsed`) exceeds it. Useful for very large data sets, see [JavaScript heap out of memory](#javascript-heap-out-of-memory). |
| `sourceMap` | `boolean` | `false` | Save source/sourcemap files to cache for debugging (requires `logging: "debug"`). |
| `sourceMapResolver` | `(url, defaultResolver) => Promise<string \| object>` | `null` | Custom sourcemap loader (e.g. from a build cache). Call `defaultResolver(url)` to fall back. |
| `onEntry` | `(entry) => void \| Promise<void>` | `null` | (V8 only) Per-entry hook; see [Hooks](#hooks). |
| `onEnd` | `(coverageResults) => void \| Promise<void>` | `null` | Hook invoked after report generation; see [Hooks](#hooks). |

## Available Reports

> V8 built-in reports (V8 data only):

- `v8`
    - Features: 
        - A Brand-New V8 Coverage Report User Interface
        - Support for Native Byte Statistics
        - Support processing big data with high performance
        - Coverage for Any Runtime Code
        - CSS Coverage Support
        - Better Support for Sourcemap Conversion
    - Demos: [V8](https://cenfun.github.io/monocart-coverage-reports/v8) and [more](https://cenfun.github.io/monocart-coverage-reports/)

![](./assets/v8.gif)

- `v8-json`
    - Save `CoverageResults` to a json file (defaults to [`coverage-report.json`](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/coverage-report.json)).
    - Shows native V8 code coverage with VSCode extension: [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)

![](./assets/mcv.gif)

> Istanbul built-in reports (both V8 and Istanbul data):

- `clover`
- `cobertura`
- `html`
    - [Istanbul html](https://cenfun.github.io/monocart-coverage-reports/istanbul/) 
    - [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/istanbul)
- `html-spa`
- `json`
- `json-summary`
- `lcov`
- `lcovonly`
    - [V8 lcov.info](https://cenfun.github.io/monocart-coverage-reports/v8/lcov.info)
    - [Istanbul lcov.info](https://cenfun.github.io/monocart-coverage-reports/istanbul/lcov.info)
- `none`
- `teamcity`
- `text`
- `text-lcov`
- `text-summary`

> Other built-in reports (both V8 and Istanbul data):

- `codecov` Save coverage data to a json file with [Codecov](https://docs.codecov.com/docs/codecov-custom-coverage-format) format (defaults to `codecov.json`), see [example](https://app.codecov.io/github/cenfun/monocart-coverage-reports).

- `codacy` Save coverage data to a json file with [Codacy API](https://api.codacy.com/swagger#tocscoveragereport) format (defaults to `codacy.json`).

- `console-summary` shows coverage summary in the console.

![](./assets/console-summary.png)

- `console-details` Show coverage details in the console. Like `text`, but for V8. For Github actions, we can enforce color with env: `FORCE_COLOR: true`.

![](./assets/console-details.png)

- `markdown-summary` Save coverage summary to a markdown file (defaults to `coverage-summary.md`). For Github actions, we can show the markdown content to [a job summary](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)
```sh
cat path-to/coverage-summary.md >> $GITHUB_STEP_SUMMARY
```
![](./assets/markdown-summary.png)

- `markdown-details` Save coverage details to a markdown file (defaults to `coverage-details.md`).
    - Preview in [runs](https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml)

- `raw` only keep all original data, which can be used for other reports input with `inputDir`. see [Merge Coverage Reports](#merge-coverage-reports)

- Custom Reporter
    ```js
    const coverageOptions = {
        reports: [
            [path.resolve('./test/custom-istanbul-reporter.js'), {
                type: 'istanbul',
                file: 'custom-istanbul-coverage.text'
            }],
            [path.resolve('./test/custom-v8-reporter.js'), {
                type: 'v8',
                outputFile: 'custom-v8-coverage.json'
            }],
            [path.resolve('./test/custom-v8-reporter.mjs'), {
                type: 'both'
            }]
        ]
    };
    ```
    - Istanbul custom reporter
    > example: [./test/custom-istanbul-reporter.js](./test/custom-istanbul-reporter.js), see [istanbul built-in reporters' implementation](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) for reference.
    - V8 custom reporter
    > example: [./test/custom-v8-reporter.js](./test/custom-v8-reporter.js)

    The `type` option selects the reporter interface and when it runs:
    - `'istanbul'` — uses the Istanbul reporter interface: `new Reporter(reportOptions)` followed by `execute(context)`. The context provides Istanbul report trees and source lookup. V8 input is converted to Istanbul coverage first.
    - `'v8'` (default) — uses `new Reporter(reportOptions, globalOptions)` followed by `await generate(reportData)` for V8 input. `reportData` is the V8 coverage result, with `type`, `summary` and `files`; each file contains V8 ranges and summaries.
    - `'both'` — uses the same `generate(reportData)` interface for either V8 or Istanbul input. Check `reportData.type` to handle the corresponding result structure. This does **not** supply both raw formats together; there are no `v8Data` or `istanbulData` properties.

    Reporters are loaded with native ESM `import()`. Use `export default Reporter` for ESM; Node's built-in interoperability also accepts CommonJS `module.exports = Reporter` (use `.cjs` inside an ESM project). Local paths must include the file extension; extensionless paths and directory entries are not resolved. No separate CommonJS loader is provided. Reporter loading and initialization errors reject report generation instead of silently skipping the reporter.

### Multiple Reports:
```js
import { MCR } from 'monocart-coverage-reports';
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        // built-in reports
        ['console-summary'],
        ['v8'],
        ['html', {
            subdir: 'istanbul'
        }],
        ['json', {
            file: 'my-json-file.json'
        }],
        'lcovonly',

        // custom reports
        // Specify reporter name with the NPM package
        ['custom-reporter-1'],
        ['custom-reporter-2', {
            type: 'istanbul',
            key: 'value'
        }],
        // Specify reporter name with local path
        ['/absolute/path/to/custom-reporter.js']
    ]
};
const mcr = MCR(coverageOptions);
```

## Compare Reports
> If the V8 data format is used for Istanbul reports, it will be automatically converted from V8 to Istanbul.

| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| Coverage data | [Istanbul](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md) (Object) | [V8](#v8-coverage-data-format) (Array) | [V8](#v8-coverage-data-format) (Array) |
| Output | [Istanbul reports](#available-reports) | [V8 reports](#available-reports)  | [Istanbul reports](#available-reports) |
| - Bytes | ❌ | ✅ | ❌ |
| - Statements | ✅ | ✅ | ✅ |
| - Branches | ✅ | ✅ | ✅ |
| - Functions | ✅ | ✅ | ✅ |
| - Lines | ✅ | ✅ | ✅ |
| - Execution counts | ✅ | ✅ | ✅ |
| CSS coverage | ❌ | ✅ | ✅ |
| Minified code | ❌ | ✅ | ❌ |

## Collecting Istanbul Coverage Data
- Before coverage collection: Instrumenting source code with Istanbul
    - webpack with babel loader: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul), see example: [webpack.config-istanbul.js](./test/build/webpack.config-istanbul.js)
    - CLI: [nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md) or API: [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md)
    - vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul)
    - rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul)
    - swc: [swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument)

- Browser
    - Collecting coverage data from `window.__coverage__`, example: [test-istanbul.js](./test/test-istanbul.js)

- Node.js
    - Collecting coverage data from `global.__coverage__`

- CDP
    - `getIstanbulCoverage()` see [`CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)

## Collecting V8 Coverage Data
- Before coverage collection: Enabling `sourcemap` for source code
    - [webpack](https://webpack.js.org/configuration/): `devtool: source-map` and `mode: development`, example [webpack.config-v8.js](./test/build/webpack.config-v8.js)
    - [rollup](https://rollupjs.org/configuration-options/): `sourcemap: true` and `treeshake: false`
    - [esbuild](https://esbuild.github.io/api/): `sourcemap: true`, `treeShaking: false` and `minify: false`
    - [vite](https://vitejs.dev/config/build-options.html): `sourcemap: true` and `minify: false`

- Browser (Chromium-based Only)
    - [Collecting V8 Coverage Data with Playwright](#collecting-v8-coverage-data-with-playwright)
    - [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)

- Node.js
    - [Collecting V8 Coverage Data from Node.js](#collecting-v8-coverage-data-from-nodejs)

- CDP
    - [Collecting V8 Coverage Data with `CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)

### Collecting V8 Coverage Data with Playwright
```js
await Promise.all([
    page.coverage.startJSCoverage({
        // reportAnonymousScripts: true,
        resetOnNavigation: false
    }),
    page.coverage.startCSSCoverage({
        // Note, anonymous styles (without sourceURLs) are not supported, alternatively, you can use CDPClient
        resetOnNavigation: false
    })
]);

await page.goto('your page url');

const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
]);

const coverageData = [... jsCoverage, ... cssCoverage];

```
For Playwright Test automatic fixtures, see [fixtures.js](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.js) in the complete [playwright-coverage example](https://github.com/cenfun/playwright-coverage). The [best-practices guide](skills/monocart-coverage-reports/references/best-practices.md#complete-project-example) explains the integration.
For more examples, see [./test/test-v8.js](./test/test-v8.js), [css](./test/test-css.js)


### Collecting Raw V8 Coverage Data with Puppeteer

> Depending on your package manager, Puppeteer may not download a browser during installation. If no browser is available, install one manually:
>
> ```sh
> npx puppeteer browsers install chrome
> ```

```js
await Promise.all([
    page.coverage.startJSCoverage({
        // reportAnonymousScripts: true,
        resetOnNavigation: false,
        // provide raw v8 coverage data
        includeRawScriptCoverage: true
    }),
    page.coverage.startCSSCoverage({
        resetOnNavigation: false
    })
]);

await page.goto('your page url');

const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
]);

// to raw V8 script coverage
const coverageData = [... jsCoverage.map((it) => {
    return {
        source: it.text,
        ... it.rawScriptCoverage
    };
}), ... cssCoverage];
```
Example: [./test/test-puppeteer.js](./test/test-puppeteer.js)

### Collecting V8 Coverage Data from Node.js
Possible solutions:
- [NODE_V8_COVERAGE](https://nodejs.org/docs/latest/api/cli.html#node_v8_coveragedir)=`dir`
    - Sets Node.js env `NODE_V8_COVERAGE`=`dir` before the program running, the coverage data will be saved to the `dir` after the program exits gracefully.
    - Read the JSON file(s) from the `dir` and generate coverage report.
    - Example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-env` node [./test/test-node-env.js](./test/test-node-env.js) && node [./test/generate-report.js](./test/generate-report.js)

- [V8](https://nodejs.org/docs/latest/api/v8.html#v8takecoverage) API + NODE_V8_COVERAGE
    - Writing the coverage started by NODE_V8_COVERAGE to disk on demand with `v8.takeCoverage()`, it does not require waiting until the program exits gracefully.
    - Example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-api` node [./test/test-node-api.js](./test/test-node-api.js)

- [Inspector](https://nodejs.org/docs/latest/api/inspector.html) API
   - Connecting to the V8 inspector and enable V8 coverage.
   - Taking coverage data and adding it to the report.
   - Example: 
   > node [./test/test-node-ins.js](./test/test-node-ins.js)
   - vm Example (scriptOffset):
   > node [./test/test-node-vm.js](./test/test-node-vm.js)
   
- [CDP](https://chromedevtools.github.io/devtools-protocol/) API
    - Enabling [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started/).
    - Collecting coverage data with CDP API.
    - Example: 
    > node --inspect=9229 [./test/test-node-cdp.js](./test/test-node-cdp.js)

- [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started) + CDP + NODE_V8_COVERAGE + V8 API
    - When the program starts a server, it will not exit on its own, thus requiring a manual invocation of the `v8.takeCoverage()` interface to manually collect coverage data. Remote invocation of the `v8.takeCoverage()` interface can be accomplished through the `Runtime.evaluate` of the CDP.
    - Example for [koa](https://github.com/koajs/koa) web server:
    > node [./test/test-node-koa.js](./test/test-node-koa.js)

- [Child Process](https://nodejs.org/docs/latest/api/child_process.html) + NODE_V8_COVERAGE
    - see [Command Line](#command-line)

### Collecting V8 Coverage Data with `CDPClient` API

`timeout` controls HTTP discovery and WebSocket connection deadlines (default: 10000ms). `requestTimeout` controls each CDP command on built-in WebSocket sessions (default: 30000ms). Set either to `0` to disable its deadline. Custom Playwright/Puppeteer sessions manage their own command timeouts. For custom sockets, use `new MCR.WSSession(ws, { timeout: 30000 })`.

- `CDPClient` available APIs
```ts
interface CoverageClient {
    startJSCoverage: () => Promise<void>;
    stopJSCoverage: () => Promise<V8CoverageEntry[]>;

    startCSSCoverage: () => Promise<void>;
    stopCSSCoverage: () => Promise<V8CoverageEntry[]>;

    /** start both js and css coverage */
    startCoverage: () => Promise<void>;
    /** stop and return both js and css coverage */
    stopCoverage: () => Promise<V8CoverageEntry[]>;

    /** write the coverage started by NODE_V8_COVERAGE to disk on demand, returns v8 coverage dir */
    writeCoverage: () => Promise<string>;

    /** get istanbul coverage data */
    getIstanbulCoverage: (coverageKey?: string) => Promise<any>;
}
```

- Work with node debugger port `--inspect=9229` or browser debugging port `--remote-debugging-port=9229`
```js
import { MCR } from 'monocart-coverage-reports';
const client = await MCR.CDPClient({
    port: 9229
});
await client.startJSCoverage();
// run your test here
const coverageData = await client.stopJSCoverage();
```

- Work with [Playwright CDPSession](https://playwright.dev/docs/api/class-cdpsession)
```js
import { chromium } from 'playwright';
import { MCR } from 'monocart-coverage-reports';
const browser = await chromium.launch();
const page = await browser.newPage();
const session = await page.context().newCDPSession(page);
const client = await MCR.CDPClient({
    session
});
// both js and css coverage
await client.startCoverage();
// run your test page here
await page.goto('your page url');
const coverageData = await client.stopCoverage();
```

- Work with [Puppeteer CDPSession](https://pptr.dev/api/puppeteer.cdpsession)
```js
import puppeteer from 'puppeteer';
import { MCR } from 'monocart-coverage-reports';
const browser = await puppeteer.launch({});
const page = await browser.newPage();
const session = await page.target().createCDPSession();
const client = await MCR.CDPClient({
    session
});
// both js and css coverage
await client.startCoverage();
// run your test page here
await page.goto('your page url');
const coverageData = await client.stopCoverage();
```

- Work with [Selenium Webdriver](https://www.selenium.dev/documentation/webdriver/) WebSocket (Chrome/Edge Browser)
```js
import { Builder, Browser } from 'selenium-webdriver';
import { MCR } from 'monocart-coverage-reports';
const driver = await new Builder().forBrowser(Browser.CHROME).build();
const pageCdpConnection = await driver.createCDPConnection('page');
const session = new MCR.WSSession(pageCdpConnection._wsConnection);
const client = await MCR.CDPClient({
    session
});
```

### V8 Coverage Data API
- [JavaScript code coverage in V8](https://v8.dev/blog/javascript-code-coverage)
- [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
- [Puppeteer Coverage Class](https://pptr.dev/api/puppeteer.coverage)
- [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) see [ScriptCoverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-ScriptCoverage) and [v8-coverage](https://github.com/bcoe/v8-coverage)
```ts
// Coverage data for a source range.
export interface CoverageRange {
    // JavaScript script source offset for the range start.
    startOffset: integer;
    // JavaScript script source offset for the range end.
    endOffset: integer;
    // Collected execution count of the source range.
    count: integer;
}
// Coverage data for a JavaScript function.
/**
 * @functionName can be an empty string.
 * @ranges is always non-empty. The first range is called the "root range".
 * @isBlockCoverage indicates if the function has block coverage information.
    If this is false, it usually means that the function was never called.
    It seems to be equivalent to ranges.length === 1 && ranges[0].count === 0.
*/
export interface FunctionCoverage {
    // JavaScript function name.
    functionName: string;
    // Source ranges inside the function with coverage data.
    ranges: CoverageRange[];
    // Whether coverage data for this function has block granularity.
    isBlockCoverage: boolean;
}
// Coverage data for a JavaScript script.
export interface ScriptCoverage {
    // JavaScript script id.
    scriptId: Runtime.ScriptId;
    // JavaScript script name or url.
    url: string;
    // Functions contained in the script that has coverage data.
    functions: FunctionCoverage[];
}
export type V8CoverageData = ScriptCoverage[];
```

| JavaScript Runtime | V8 Coverage |  |
| :--------------| :----: | :----------------------  |
| Chrome (65%) | ✅ | Chromium-based |
| Safari (18%) | ❌ |  |
| Edge (5%) | ✅ | Chromium-based |
| Firefox (2%) | ❌ |  |
| Node.js | ✅ |  |
| Deno | ❌ | [issue](https://github.com/denoland/deno/issues/23359) |
| Bun | ❌ | [issue](https://github.com/oven-sh/bun/issues/30968) |

> MCR extends each V8 coverage entry with additional fields:

| Field | Type | Description |
| :-- | :-- | :-- |
| `url` | `string` | Script URL or file path |
| `type` | `"js" \| "css"` | Entry type |
| `source` | `string` | (JS) Source code text |
| `sourceMap` | `object` | (JS) Parsed sourcemap object |
| `scriptOffset` | `number` | (JS) Byte offset for the script wrapper (e.g. in `vm` modules). This offset is automatically added to all range start/end values |
| `distFile` | `string` | (JS) The dist bundle file this source was unpacked from |
| `empty` | `boolean` | Marked as `true` when this entry was added via the `all` option (no real coverage data), showing 0% coverage |
| `fake` | `boolean` | Marked as `true` when the source code is not original (e.g. compiled from `.ts`/`.jsx`). The AST parser skips coverage extraction for fake sources |

These fields can be read/mutated in [`onEntry`](#hooks) hooks.

## Filtering Results
### Using `entryFilter` and `sourceFilter` to filter the results for V8 report
When V8 coverage data collected, it actually contains the data of all entry files, for example:

- *dist/main.js*
- *dist/vendor.js*
- *dist/something-else.js*

We can use `entryFilter` to filter the entry files. For example, we should remove `vendor.js` and `something-else.js` if they are not in our coverage scope. 

- *dist/main.js*

When inline or linked sourcemap exists to the entry file, the source files will be extracted from the sourcemap for the entry file, and the entry file will be removed if `logging` is not `debug`.

- *src/index.js*
- *src/components/app.js*
- *node_modules/dependency/dist/dependency.js*

We can use `sourceFilter` to filter the source files. For example, we should remove `dependency.js` if it is not in our coverage scope.

- *src/index.js*
- *src/components/app.js*

For example:
```js
const coverageOptions = {
    entryFilter: (entry) => entry.url.indexOf('main.js') !== -1,
    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1
};
```
Or using [`minimatch`](https://github.com/isaacs/minimatch) pattern:
```js
const coverageOptions = {
    entryFilter: '**/main.js',
    sourceFilter: '**/src/**'
};
```
Support multiple patterns:
```js
const coverageOptions = {
    entryFilter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/src/**': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/**': true
    }
};
```
As CLI args (JSON-like string. Added in: v2.8):
```sh
mcr --sourceFilter "{'**/node_modules/**':false,'**/**':true}"
```
Note, those patterns will be transformed to a function, and the order of the patterns will impact the results:
```js
const coverageOptions = {
    entryFilter: (entry) => {
        if (minimatch(entry.url, '**/node_modules/**')) {
            return false;
        }
        if (minimatch(entry.url, '**/vendor.js')) {
            return false;
        }
        if (minimatch(entry.url, '**/src/**')) {
            return true;
        }
        // else unmatched
        return false;
    }
};
```

### Using `filter` instead of `entryFilter` and `sourceFilter`
If you don't want to define both `entryFilter` and `sourceFilter`, you can use `filter` instead. (Added in: v2.8)
```js
const coverageOptions = {
    // combined patterns
    filter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/src/**': true,
        '**/**': true
    }
};
```

### Using `outputFilter` to filter final files
> **Version requirement:** `outputFilter` is introduced in **v3.0.0**. It is not supported in v2.13.x or earlier.

**Choose one filtering approach.** `outputFilter` and the existing `entryFilter` + `sourceFilter` approach serve the same purpose: deciding which files appear in the report. They are alternatives, not additional filters you need to configure together. The combined `filter` option is shorthand for `entryFilter` + `sourceFilter`; it does not configure `outputFilter`.

| Approach | When and what it filters | Advantages | Trade-offs |
| :-- | :-- | :-- | :-- |
| `entryFilter` + `sourceFilter` (or `filter`) | Filters inputs during discovery: `entryFilter` matches entry URLs, and `sourceFilter` matches source paths as sourcemaps are unpacked. | Excludes unwanted files earlier, avoiding unnecessary downstream processing. Prefer this approach for better performance, especially with large projects or bundles. | Requires understanding entry files versus sourcemap sources and configuring both stages. Excluding a bundle via `entryFilter` also removes any desired sources inside it. |
| `outputFilter` | Filters final files by `sourcePath` after sourcemap conversion, merging and adding untested files (`all`), immediately before report generation. | Simpler configuration: use one filter against the final file list, without distinguishing entries from unpacked sources. | Unwanted files are still discovered and processed before being discarded. This does not save their earlier processing cost and can increase generation time and memory usage, especially when many files will ultimately be excluded. |

**Recommendation:** use input filtering (`entryFilter` + `sourceFilter`, or `filter`) when performance matters. Choose `outputFilter` when simpler configuration and filtering the final results are more important, and the extra processing cost is acceptable. If switching to `outputFilter`, remove the old input filters for the same scope: output filtering cannot restore files already excluded during input filtering.

For V8 input, `outputFilter` filters both V8 reports and converted Istanbul reports. It defaults to `null` (disabled).

Like `entryFilter` and `sourceFilter`, it supports strings and ordered pattern objects (the first matching pattern wins; unmatched files are excluded). Patterns match the final `sourcePath`, including any `sourcePath` rewrites. A function receives the final file entry, not a path string.

```js
const coverageOptions = {
    outputFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    }
};
// Alternatively:
// outputFilter: '**/src/**'
// outputFilter: (entry) => entry.sourcePath.startsWith('src/')
```

CLI examples (quote patterns to prevent shell expansion):
```sh
mcr merge --inputDir ./raw --outputFilter "**/src/**"
mcr merge --inputDir ./raw --outputFilter "{'**/node_modules/**':false,'**/src/**':true}"
```

`outputFilter` does not change raw coverage exports and does not apply to Istanbul input.

## Resolve `sourcePath` for the Source Files
If the source file comes from the sourcemap, then its path is a virtual path. Using the `sourcePath` option to resolve a custom path.
For example, we have tested multiple dist files, which contain some common files. We hope to merge the coverage of the same files, so we need to unify the `sourcePath` in order to be able to merge the coverage data.
```js
const coverageOptions = {
    sourcePath: (filePath) => {
        // Remove the virtual prefix
        const list = ['my-dist-file1/', 'my-dist-file2/'];
        for (const str of list) {
            if (filePath.startsWith(str)) {
                return filePath.slice(str.length);
            }
        }
        return filePath;
    }
};
```
Built-in report path normalization is best-effort; it cannot fully reconcile every nonstandard, virtual, or foreign-platform path. Use `sourcePath` to correct these special cases rather than relying on automatic inference. The callback receives the normalized `filePath`; for V8 entries and sourcemap sources, `info.url` provides the original URL before report path normalization (including the sourcemap's `sourceRoot`, when present). This rewrites report paths, not the filesystem paths used to load missing source content. When `sourcesContent` is missing, local sources are loaded relative to the external map's URL (or the generated file for inline maps), with `sourceRoot` applied as a directory.

It also supports simple key/value replacement:
```js
const coverageOptions = {
    sourcePath: {
        'my-dist-file1/': '',
        'my-dist-file2/': ''
    }
};
```
Normalize the full path of the file:
```js
import path from 'node:path';

// MCR coverage options
const coverageOptions = {
    sourcePath: (filePath, info) => {
        if (!filePath.includes('/') && info.distFile) {
            return `${path.dirname(info.distFile)}/${filePath}`;
        }
        return filePath;
    }
};
```

## Adding Empty Coverage for Untested Files
Untested files are excluded by default. Use `all` to include them with 0% coverage, even when no coverage data was collected. For the same original source, real V8 coverage takes precedence over empty entries.
```js
const coverageOptions = {
    all: './src'

    // or multiple dirs
    // all: ['./src', './lib']
};
```
The untested files will apply to the `sourceFilter`. And it also supports additional `filter` (return the file type for js or css coverage):
```js
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: {
            // exclude files
            '**/ignored-*.js': false,
            '**/*.html': false,
            // empty css coverage
            '**/*.scss': 'css',
            '**/*': true
        }
    }
};
```
Untested files can be transformed into JavaScript for AST analysis. This example handles **TypeScript without JSX** and assumes `@swc/core` is installed. Use an appropriate compiler/parser for JSX/TSX or Vue; this is not a universal transformer. Preserve the full filename to keep same-basename files in different directories distinct, and parse SWC's JSON map before assigning it.
```js
import { fileURLToPath } from 'node:url';
import { transform } from '@swc/core';
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: '**/*.ts',
        transformer: async (entry) => {
            const { code, map } = await transform(entry.source, {
                filename: fileURLToPath(entry.url),
                sourceMaps: true,
                isModule: true,
                jsc: {
                    parser: {
                        syntax: 'typescript'
                    }
                }
            });
            entry.source = code;
            entry.sourceMap = JSON.parse(map);
        }
    }
};
```

## Hooks

### `onEnd` — after the report is generated
Typical use case: enforce coverage thresholds. Throw on failure so API callers can handle the error and the CLI exits nonzero, without forcing `process.exit()` before cleanup finishes.
```js
const getCoverageError = (metric, summary, minimum) => {
    if (!summary || !(summary.total > 0)) {
        return `${metric}: missing or empty coverage`;
    }
    const { pct } = summary;
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < minimum) {
        return `${metric}: ${pct}%, required ${minimum}%`;
    }
    return '';
};
const coverageOptions = {
    name: 'My Coverage Report',
    outputDir: './coverage-reports',
    onEnd: (coverageResults) => {
        if (!coverageResults) {
            throw new Error('No coverage results');
        }
        const thresholds = {
            bytes: 80,
            lines: 60
        };
        const errors = [];
        for (const [metric, minimum] of Object.entries(thresholds)) {
            const error = getCoverageError(metric, coverageResults.summary?.[metric], minimum);
            if (error) {
                errors.push(error);
            }
        }
        if (errors.length) {
            throw new Error(errors.join('\n'));
        }
    }
};
```

This policy rejects missing/zero-total metrics; adapt it explicitly if a metric is legitimately empty. With no usable input, `generate()` may return `undefined` without calling `onEnd`. API callers must check that result; ordinary CLI workflows should use a fresh output directory and verify a newly generated nonempty report. See the [strict CI recipes](skills/monocart-coverage-reports/references/reports-and-ci.md#reject-stale-reports-and-missing-collection-in-ci).

### `onEntry` — before each V8 entry is processed (V8 only)
Use this to mutate the entry (for example, transform non-standard sources into valid ECMAScript before the AST parser runs). See [Unparsable source](#unparsable-source).
```js
const coverageOptions = {
    onEntry: async (entry) => {
        // entry.source, entry.sourceMap, entry.fake, ...
    }
};
```

### `onTestEnd` — `mcr test` only

`onTestEnd(testResults)` runs once after the test runner exits and its JSON results are collected, before publishing the test results cache, `onReady`, and coverage generation. It is awaited even when assertions fail. Other commands, API calls, and runs skipped because no targets were supplied do not call it. The existing `onEnd(coverageResults)` is unchanged.

`mcr test` always collects structured test results using an internal JSON reporter, preserving terminal output and user-specified reporter/destination pairs. `onTestEnd` is optional; omitting it does not disable result collection. To retain results for later use, enable `raw` reports or debug logging; normal cache cleanup still applies.

```js
// mcr.config.js
export default {
    test: './test/**/*.test.js',
    onTestEnd: (testResults) => {
        console.log(testResults.summary);
        for (const test of testResults.tests) {
            console.log(test.name, test.status, test.error);
        }
    }
};
```

- `id`: a collection ID generated with the same `Util.uid()` mechanism as coverage cache data.
- `framework`: `'node:test'`.
- `complete`: whether the final runner summary was received, not whether tests passed.
- `summary`: `{ tests, suites, passed, failed, cancelled, skipped, todo, duration, success }`; `null` if incomplete. Counts come from the runner's final summary; `tests` excludes suites. Durations are in milliseconds.
- `tests`: completed test and suite records, including nested tests: `{ name, type, nesting, testNumber, file?, line?, column?, duration, status, skip?, todo?, error? }`. Status is `passed`, `failed`, `cancelled`, `skipped`, or `todo`. Errors always include string `name` and `message` (defaults: `'Error'` and `''`). Other own enumerable data properties are copied only when their values are strings, booleans, finite numbers, or `null`; BigInts become decimal strings. Getters/setters, objects/arrays, functions, symbols, `undefined`, `NaN`, and infinities are omitted without recursive traversal. Apart from the two fixed fields, inherited/non-enumerable properties are not collected, so normal `stack` is omitted and fields inside `cause` are not flattened. Explicitly enumerable string `stack` is copied like any other string. Reserved keys `__proto__`, `constructor`, and `prototype` are excluded; the fixed fields cannot be overwritten by extra properties.

Test failures, incomplete/missing/invalid reports, and hook errors keep the command nonzero. An incomplete report is delivered with `complete: false`; a missing or invalid JSON report cannot be delivered and is logged as a collection error. A nonzero `process.exitCode` set by `onTestEnd` cannot be cleared by later coverage hooks. Hook/collection errors do not prevent MCR from attempting coverage generation. If the hook throws, test results are not published or exported, rather than falling back to possibly unredacted data. Test results are independent of coverage, so this hook can run even if coverage generation later fails.

Test results use the same ID and filename mechanism as coverage cache data: `outputDir/.cache/test-results-<id>.json`, with the same `id` stored in the JSON. The reporter streams records into `.json.tmp` with its collection ID already included. A small `.meta.tmp` completion record verifies the final byte count. Without a hook, MCR reads only this completion record and renames the JSON, without loading or rewriting the full report. With a hook, MCR reads the full result object and publishes its mutations after the hook completes. Temporary output and metadata are removed before coverage generation. Finalized JSON follows the coverage cache lifecycle: normally cleaned after generation, retained in debug mode, or exported by `raw` (including ZIP). It is not embedded in HTML/coverage JSON reports, and importing raw data does not yet merge test results. Save results yourself if needed; files written into `outputDir` by this hook may be removed by the subsequent coverage cleanup when `clean: true`.

**Sensitive data:** Primitive does not mean non-sensitive: a string `token`, `password`, or response body is also copied. Messages, test names, and paths may contain credentials or personal data; large strings can also increase report size. MCR does not redact them automatically. Keep the output directory private and review raw/debug artifacts before uploading them. Mutate results in `onTestEnd` to sanitize the persisted JSON; this does not redact Node's terminal output or data already written to temporary files. For example, adapt the following rule to your application's data:

```js
export default {
    onTestEnd: (results) => {
        for (const test of results.tests) {
            if (test.error) {
                for (const [key, value] of Object.entries(test.error)) {
                    if (typeof value === 'string') {
                        test.error[key] = value.replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]');
                    }
                }
            }
        }
    }
};
```

### `onStart` / `onReady` — CLI-only
Only available when using `mcr <command>`:
- `onStart(coverageReport)` — runs before the child process is spawned.
- `onReady(coverageReport, nodeV8CoverageDir, subprocess)` — runs after the child exits, before MCR reads coverage from `nodeV8CoverageDir`. Useful when the child hasn't finished flushing coverage data and needs to be waited on.
```js
// mcr.config.js
export default {
    onReady: async (coverageReport, nodeV8CoverageDir, subprocess) => {
        // wait for something, or pre-process the raw files
    }
};
```

## Ignoring Uncovered Codes
<!-- readme-lint-disable -->

To ignore codes, use the special comment which starts with `v8 ignore `:
- Ignoring all until stop
```js
/* v8 ignore start */
function uncovered() {
}
/* v8 ignore stop */
```
- Ignoring the next line or next N lines
```js
/* v8 ignore next */
const os = platform === 'win32' ? 'Windows' : 'Other';

const os = platform === 'win32' ? 'Windows' /* v8 ignore next */ : 'Other';

// v8 ignore next 3
if (platform === 'linux') {
    console.log('hello linux');
}
```
- Compatible with [c8 coverage](https://github.com/bcoe/c8/?tab=readme-ov-file#ignoring-all-lines-until-told) or [nodejs coverage](https://nodejs.org/docs/latest/api/test.html#collecting-code-coverage) syntax
```js
/* c8 ignore start */
function uncovered() {
}
/* c8 ignore stop */

/* node:coverage disable */
function uncovered() {
}
/* node:coverage enable */
```
- To disable comment-based ignoring entirely, set `v8Ignore: false`.

<!-- readme-lint-enable -->

## Multiprocessing Support
> The data will be added to `[outputDir]/.cache`, After the generation of the report, this data will be removed unless debugging has been enabled or a raw report has been used, see [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
- Main process, before the start of testing
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
// clean previous cache before the start of testing
// unless the running environment is new and no cache
mcr.cleanCache();
```

- Sub process 1, testing stage 1
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData1);
```

- Sub process 2, testing stage 2
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData2);
```

- Main process, after the completion of testing
```js
// generate coverage reports after the completion of testing
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.generate();
```

## Command Line
> The CLI will run the program as a [child process](https://nodejs.org/docs/latest/api/child_process.html) with `NODE_V8_COVERAGE=dir` until it exits gracefully, and generate the coverage report with the coverage data from the `dir`.

- Installing globally
```sh
npm i monocart-coverage-reports -g
mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

- Locally in your project
```sh
npm i monocart-coverage-reports
npx mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

- CLI Options

Commands are executed with Execa's default options, without enabling shell mode. Pass the executable and its arguments separately, for example `mcr node "./my app.js"`; do not quote an entire command as a single argument. Argument boundaries are preserved: MCR does not expand environment variables or globs, or interpret pipes, redirections, `&&` or other shell syntax. Move command sequences into a script instead. Use `mcr [options] -- executable ...args` to keep child options separate from MCR options. Execa handles platform-specific command execution, including escaped batch-file invocation through `cmd.exe` when needed on Windows.

The options below are only available when using the CLI (`mcr <command>`):

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `-c, --config` | `string` | — | Custom config file path |
| `--import` | `string` | `null` | Preload ESM module via `NODE_OPTIONS`, e.g. `tsx` for TypeScript. |
| `--require` | `string` | `null` | Deprecated alias for `--import`; uses ESM loading, not CommonJS resolution |
| `--env` | `string` | `null` | Load environment variables from a dotenv file (defaults to `.env`). |
| `test` (config only) | `string \| string[] \| null` | `null` | Default test file paths or glob patterns accepted by `node --test`, passed unchanged when `mcr test` has no positional targets; ignored by other commands and the API. Requires Node.js `>= 22.15.0` |
| `onTestEnd` (config only) | `(testResults) => void \| Promise<void>` | `null` | Only `mcr test`: runs after test result collection, before `onReady` and coverage generation; see [Hooks](#hooks) |
| `onStart` | `(coverageReport) => Promise<void>` | `null` | Runs before the child process is spawned; see [Hooks](#hooks) |
| `onReady` | `(coverageReport, nodeV8CoverageDir, subprocess) => Promise<void>` | `null` | Runs after the child exits, before MCR reads coverage; see [Hooks](#hooks) |

For other options (e.g. `--name`, `--reports`, `--outputDir`, `--lcov`, etc.), see the [Options](#options) table — they work the same way in CLI.

- Use `--` to separate sub CLI args
```sh
mcr -c mcr.config.js -- sub-cli -c sub-cli.config.js
```

- `--import <module>` / `--require <module>`: forward a preload module to the child process via `NODE_OPTIONS`. Use this for TypeScript/JSX runtimes (`tsx`, `ts-node`, etc.) and also when loading a `mcr.config.ts`. Available on all supported Node.js versions. Local paths are relative to the current working directory and must include the file extension; paths containing spaces are supported. Package names use native ESM resolution from MCR's module location. Both flags use `import()` and forward `--import` to Node; `--require` is a deprecated alias, not a CommonJS loader. CJS modules work only through Node's built-in import interoperability.
```sh
mcr --import tsx node ./test.ts
```

- `--env [path]`: load environment variables from a dotenv file before the child starts (defaults to `.env`). Uses `process.loadEnvFile`, available on all supported Node.js versions.
```sh
mcr --env .env.test node ./test.js
```

- `test`: run Node.js tests and generate coverage reports. See [Run Tests with `mcr test`](#run-tests-with-mcr-test).

- `merge`: merge raw coverage data from `inputDir`(s) and generate merged reports directly, without running a child process.
```sh
mcr merge -r v8,console-details --inputDir ./coverage-reports/unit/raw,./coverage-reports/e2e/raw --outputDir ./coverage-reports/merged
```
See [Merge Coverage Reports](#merge-coverage-reports).

- Examples
    - [Mocha](#mocha)
    - [TypeScript](#typescript)
    - [AVA](#ava)

## Config File
In MCR 3.x, `loadConfig()` throws if an explicitly requested config does not exist or a discovered config fails to load (including JSON parsing, module syntax and startup errors). All CLI commands exit with a non-zero status for these errors. No `strict` option is needed. If no custom config is requested and no default config is found, execution continues with existing options.

Loading config file by priority:
- Custom config file:
    - CLI: `mcr --config <my-config-file-path>`
    - API: `await mcr.loadConfig("my-config-file-path")`
- `mcr.config.js`
- `mcr.config.cjs`
- `mcr.config.mjs`
- `mcr.config.json` - json format
- `mcr.config.ts` (requires preloading the TypeScript execution module, for example with `tsx`):
```sh
mcr --import tsx -c mcr.config.ts node ./test.js
```

> If no custom path is given, MCR walks up from the current working directory to find the default config file (via [`find-up`](https://github.com/sindresorhus/find-up)). Files outside the search path will be ignored.

## Run Tests with `mcr test`

**New in MCR 3.x:** Run tests with the built-in [Node.js test runner](https://nodejs.org/docs/latest/api/test.html) and automatically generate coverage reports with one command. Requires **Node.js >= 22.15.0**.

Install MCR and run your test files directly — no config file is required:

```sh
npm install --save-dev monocart-coverage-reports
npx mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
```

This runs the matching tests, prints a coverage summary in the terminal, and writes the V8 HTML report to `./coverage-reports/index.html`. Quote glob patterns so Node.js, rather than your shell, handles matching.

For repeated runs, save the test targets and coverage options in `mcr.config.js` (ESM; use `"type": "module"` in `package.json`, or name the config `mcr.config.mjs`):

```js
export default {
    test: ['./test/unit/**/*.test.js', './test/integration/**/*.test.js'],
    reports: ['v8', 'console-summary'],
    outputDir: './coverage-reports'
};
```

```sh
# Run the targets from the config
npx mcr test
# Override the configured targets and forward Node.js test runner options after --
npx mcr test "./test/unit/**/*.test.js" -- --test-reporter=spec

# Use an explicit config file
npx mcr test "../tests/**/*.test.js" -c ./mcr.config.js

# Choose reports from the command line
npx mcr test "../tests/**/*.test.js" -r v8,console-summary

# Run multiple test files
npx mcr test ./test/first.test.js ./test/second.test.js

# Filter test names and select a reporter
npx mcr test "../tests/**/*.test.js" -c ./mcr.config.js -- --test-name-pattern="my test" --test-reporter=spec

# Place the test command after an initial separator
npx mcr -c ./mcr.config.js -- test "../tests/**/*.test.js" -- --test-reporter=spec
```

Positional targets override (rather than append to) the config `test` option. If no positional targets are given, the config option is used. A config file is not required when targets are supplied on the command line. Existing MCR options such as `-c`, `-r`, `-o` and `--lcov` can appear before or after targets. Put Node runner options after `--`; those arguments are forwarded unchanged, not parsed as MCR options or target overrides. Quote globs to prevent shell expansion. In the alternative `mcr [options] -- test ...` form, put all MCR options before the first `--`; a second `--` separates Node runner options.

Targets are passed unchanged to `node --test`. MCR does not check their types or filesystem existence, expand directories/globs, resolve or normalize paths, escape special characters, or deduplicate targets. `node --test` accepts positional test file paths or glob patterns, not a JavaScript configuration object. In MCR config, a string represents one such argument (it is not split on spaces), and a string array represents multiple arguments forwarded in their original order. `null` is only MCR's skip default and is never passed to Node. Node handles discovery, matching, interpretation and errors. Relative paths use the current working directory, not the config file directory. A bare directory is not promised to trigger recursive discovery; use a glob such as `"../tests/**/*.test.js"` for recursive matching, following the installed Node version's native behavior. TypeScript execution depends on your Node version or a loader such as `--import tsx`.

`test` defaults to `null`; when no positional targets are supplied, `null`, an omitted value, an empty string or `[]` skips tests without generating a report. MCR only checks whether targets were supplied; invalid or unmatched targets are left to Node. If no coverage data is produced and no report can be generated, the command fails at report generation. Missing explicit config files and failed config loading also fail the command rather than silently skipping tests. Test failures still produce coverage reports and retain a non-zero exit status; report generation failures also fail the command. Existing coverage options and CLI hooks are supported. Use coverage filters to exclude test files if needed. **The `test` option has no effect on other CLI commands or API calls**, including `merge` and `generate()`.

See [Command Line](#command-line) for other CLI options.

## Merge Coverage Reports
The following usage scenarios may require merging coverage reports:
- When the code is executed in different environments, like Node.js `server side` and browser `client side` (`Next.js` for instance). Each environment may generate its own coverage report. Merging them can give a more comprehensive view of the test coverage.
- When the code is subjected to different kinds of testing. For example, `unit tests` with `Jest` might cover certain parts of the code, while `end-to-end tests` with `Playwright` might cover other parts. Merging these different coverage reports can provide a holistic view of what code has been tested.
- When tests are run on different machines or containers, each might produce its own coverage report. Merging these can give a complete picture of the test coverage across all machines or shards.

### Automatic Merging
- The `MCR` will automatically merge all the added coverage data when executing `generate()`. And it supports adding coverage data asynchronously across processes, see [Multiprocessing Support](#multiprocessing-support)
- For `Next.js`, it can actually add coverage data including both server side and client side before executing `generate()`, see example [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
- Using `Codecov`, a popular online code coverage service, which supports automatic merging of reports. Please use report `codecov`, it will generate report file `codecov.json`. If multiple `codecov.json` files are generated, upload all these files, they will be automatically merged. see [Codecov](#codecov) and [merging reports](https://docs.codecov.com/docs/merging-reports)

### Manual Merging
If the reports cannot be merged automatically, then here is how to manually merge the reports.  
First, using the `raw` report to export the original coverage data to the specified directory.
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
    - see more [Integration Examples](#integration-examples)

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

## Common issues
### Unexpected coverage
In most cases, it happens when the coverage of the generated code is converted to the coverage of the original code through a sourcemap. In other words, it's an issue with the sourcemap. Most of the time, we can solve this by setting `minify` to `false` in the configuration of build tools. Let's take a look at an example:
```text
const a = tf ? 'true' : 'false';
               ^     ^  ^
              m1     p  m2
```
In the generated code, there is a position `p`, and we need to find out its corresponding position in the original code. Unfortunately, there is no matched mapping for the position `p`. Instead, it has two adjacent upstream and downstream mappings `m1` and `m2`, so, the original position of `p` that we are looking for, might not be able to be precisely located. Especially, the generated code is different from the original code, such as the code was minified, compressed or converted, it is difficult to find the exact original position without matched mapping. 
- Further understanding of sourcemap, try [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)

How `MCR` Works:
1. Tries to fix the original position with string comparison and [`diff-sequences`](https://github.com/jestjs/jest/tree/main/packages/diff-sequences). However, for non-JS code such as Vue templates or JSX, a perfect solution may not always be possible.
2. Finds all functions, statements and branches by parsing the source code [AST](https://github.com/acornjs/acorn). (One small caveat: V8 cannot provide effective branch coverage information for `AssignmentPattern`.)


### Unparsable source
It happens during the parsing of the source code into AST, if the source code is not in the standard ECMAScript. For example `ts`, `jsx` and so on. There is a option to fix it, which is to manually compile the source code for these files.
```js
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as TsNode from 'ts-node';
const coverageOptions = {
    onEntry: (entry) => {
        const filePath = fileURLToPath(entry.url);
        const originalSource = fs.readFileSync(filePath).toString('utf-8');
        const fileName = path.basename(filePath);
        const tn = TsNode.create({});
        const source = tn.compile(originalSource, fileName);
        entry.fake = false;
        entry.source = source;
    }
};
```

### JavaScript heap out of memory
When there are a lot of raw v8 coverage files to process, it may cause OOM. We can try the following Node.js options:
```sh
- run: npm run test:coverage
    env:
        NODE_OPTIONS: --max-old-space-size=8192
```


## Debug for Coverage and Sourcemap
> Sometimes, the coverage is not what we expect. The next step is to figure out why, and we can easily find out the answer step by step through debugging.
- Start debugging for v8 report with option `logging: 'debug'`
```js
const coverageOptions = {
    logging: 'debug',
    reports: [
        ['v8'],
        ['console-details']
    ]
};
```
When `logging` is `debug`, the raw report data is preserved in `[outputDir]/.cache` (or `[outputDir]/raw` if the `raw` report is used). The dist file is also kept in the V8 list, so you can open the browser's devtools and visually verify the coverage data.
![](./assets/debug-coverage.png)

- Check sourcemap with [Source Map Visualization](https://evanw.github.io/source-map-visualization/)

![](./assets/debug-sourcemap.png)

- Generate additional source and sourcemap files to cache or raw dir
```js
const coverageOptions = {
    logging: 'debug',
    sourceMap: true
};
```

- Show time logs with env `MCR_LOG_TIME`
```js
process.env.MCR_LOG_TIME = true;
```

### CSS coverage issues

CSS coverage from multiple bundles is merged as a union for each original source.

For preprocessor syntax that `all` cannot parse directly, use `all.transformer` to compile to CSS, set `entry.type = 'css'`, and preserve the sourcemap.

#### Sass mixins and `@include`

Sass `@include` can map a generated rule to non-contiguous source locations. When a rule cannot be reliably mapped, MCR reports the **whole bundle as generated CSS** instead of the preprocessor sources. That bundle's coverage is not merged into the original-source coverage.

#### Line coverage of untested preprocessor sources

Untested files included through `all` have `0%` byte coverage, including sourcemap originals. Lines outside parsed or mapped rules (such as variables or unused mixins) may appear covered; use **bytes** coverage for these files.

#### Source map can be inaccurate after minification
CSS minification can produce imprecise sourcemaps and trigger fallback to generated CSS. If source mapping is inaccurate, try **disabling CSS minification**.

#### V8 covered the whole block

Chromium may mark an entire media query or nested CSS block as covered. Consider [postcss-atomic-selectors](https://www.npmjs.com/package/postcss-atomic-selectors) as a potential workaround.

## Integration with Any Testing Framework
- API
    - Collecting coverage data when any stage of the test is completed, and adding the coverage data to the coverage reporter. `await mcr.add(coverageData)`
    - Generating the coverage reports after the completion of all tests. `await mcr.generate()`
    - see [Multiprocessing Support](#multiprocessing-support)
- CLI
    - Wrapping with any CLI. `mcr your-cli --your-arguments`
    - see [Command line](#command-line)

## Integration Examples

### [Playwright](https://github.com/microsoft/playwright)
- [playwright-coverage](https://github.com/cenfun/playwright-coverage) - Example for Playwright coverage reports
- [playwright-bdd-coverage](https://github.com/cenfun/playwright-bdd-coverage) - Example for Playwright BDD coverage reports
- [monocart-reporter](https://github.com/cenfun/monocart-reporter) - Playwright custom reporter, supports generating [Code coverage report](https://github.com/cenfun/monocart-reporter?#code-coverage-report)
- Coverage for component testing with `monocart-reporter`:
    - [playwright-ct-vue](https://github.com/cenfun/playwright-ct-vue)
    - [playwright-ct-react](https://github.com/cenfun/playwright-ct-react)
    - [playwright-ct-svelte](https://github.com/cenfun/playwright-ct-svelte)
- Coverage for Next.js, both server side and client side:
    - [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
    - [nextjs-with-playwright-istanbul](https://github.com/cenfun/nextjs-with-playwright-istanbul)
- Coverage for Remix:
    - [remix-with-playwright](https://github.com/cenfun/remix-with-playwright)
- see [Collecting V8 Coverage Data with Playwright](#collecting-v8-coverage-data-with-playwright)

### [c8](https://github.com/bcoe/c8)
- c8 has integrated `MCR` as an experimental feature since [v10.1.0](https://github.com/bcoe/c8/releases/tag/v10.1.0)
```sh
c8 --experimental-monocart --reporter=v8 --reporter=console-details node foo.js
```

### [CodeceptJS](https://github.com/codeceptjs/CodeceptJS)
- CodeceptJS is a [BDD](https://codecept.io/bdd/) + [AI](https://codecept.io/ai/) testing framework for e2e testing, it has integrated `MCR` since [v3.5.15](https://github.com/codeceptjs/CodeceptJS/releases/tag/3.5.15), see [plugins/coverage](https://codecept.io/plugins/#coverage)

### [VSCode](https://github.com/microsoft/vscode)
- [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode) - Shows native V8 code coverage in VSCode

### [Jest](https://github.com/jestjs/jest/)
- [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage) - Jest custom reporter for coverage reports
- [merge-code-coverage](https://github.com/cenfun/merge-code-coverage) - Example for merging code coverage (Jest unit + Playwright e2e sharding)

### [Vitest](https://github.com/vitest-dev/vitest)
- [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage) - Vitest custom provider module for coverage reports
- [merge-code-coverage-vitest](https://github.com/cenfun/merge-code-coverage-vitest) - Example for merging code coverage (Vitest unit + Playwright e2e sharding)

### [Node Test Runner](https://nodejs.org/docs/latest/api/test.html)
- [node-monocart-coverage](https://github.com/cenfun/node-monocart-coverage) - Custom reporter for Node test runner for coverage

### [Puppeteer](https://github.com/puppeteer/puppeteer/)
- [jest-puppeteer-coverage](https://github.com/cenfun/jest-puppeteer-coverage) - Example for Jest puppeteer coverage
- [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) - Example for Jest (unit) + Puppeteer (e2e) + Codecov
- see [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)

### [Cypress](https://github.com/cypress-io/cypress)
- [cypress-monocart-coverage](https://github.com/cenfun/cypress-monocart-coverage) - Cypress plugin for coverage reports

### [WebdriverIO](https://github.com/webdriverio/webdriverio)
- [wdio-monocart-service](https://github.com/cenfun/wdio-monocart-service) - WebdriverIO service for coverage reports

### [Storybook Test Runner](https://github.com/storybookjs/test-runner)
- [storybook-monocart-coverage](https://github.com/cenfun/storybook-monocart-coverage) - Example for Storybook V8 coverage reports

### [TestCafe](https://github.com/DevExpress/testcafe)
- [testcafe-reporter-coverage](https://github.com/cenfun/testcafe-reporter-coverage) - TestCafe custom reporter for coverage reports

### [Selenium Webdriver](https://github.com/seleniumhq/selenium)
- [selenium-webdriver-coverage](https://github.com/cenfun/selenium-webdriver-coverage) - Example for Selenium Webdriver V8 coverage reports

### [Mocha](https://github.com/mochajs/mocha)
```sh
mcr mocha ./test/**/*.js
```

### [TypeScript](https://github.com/microsoft/typescript)

- [tsx](https://github.com/privatenumber/tsx)
```sh
cross-env NODE_OPTIONS="--import tsx" npx mcr tsx ./src/example.ts
cross-env NODE_OPTIONS="--import tsx" npx mcr mocha ./test/**/*.ts
# MCR 3.x: Node.js >= 22.15.0
mcr --import tsx tsx ./src/example.ts
mcr --import tsx mocha ./test/**/*.ts
```
- [ts-node](https://github.com/TypeStrong/ts-node)
```sh
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr ts-node ./src/example.ts
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr mocha ./test/**/*.ts
```

### [AVA](https://github.com/avajs/ava)
```sh
mcr ava
```

### [Codecov](https://codecov.com/)
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
- Supports native `codecov` built-in report ([specification](https://docs.codecov.com/docs/codecov-custom-coverage-format))
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        ['codecov']
    ]
};
```
- Github actions:
```yml
- name: Codecov
    uses: codecov/codecov-action@v4
    with:
        token: ${{ secrets.CODECOV_TOKEN }}
        files: ./coverage-reports/codecov.json
```

### [Codacy](https://www.codacy.com/)
[![Codacy](https://app.codacy.com/project/badge/Coverage/715016ea8e90479db875b777db8bad55)](https://app.codacy.com/gh/cenfun/monocart-coverage-reports/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
- Using `lcov` report:
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
- Github actions:
```yml
- name: Codacy Coverage Reporter
    uses: codacy/codacy-coverage-reporter-action@v1
    with:
        project-token: ${{ secrets.CODACY_PROJECT_TOKEN }}
        coverage-reports: ./docs/mcr/lcov.info
```

### [Coveralls](https://coveralls.io/)
[![Coverage Status](https://coveralls.io/repos/github/cenfun/monocart-coverage-reports/badge.svg?branch=main)](https://coveralls.io/github/cenfun/monocart-coverage-reports?branch=main)
- Using `lcov` report:
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
- Github actions:
```yml
- name: Coveralls
    uses: coverallsapp/github-action@v2
    with:
        files: ./coverage-reports/lcov.info
```

### [Sonar Cloud](https://sonarcloud.io/)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=monocart-coverage-reports&metric=coverage)](https://sonarcloud.io/summary/new_code?id=monocart-coverage-reports)
- Using `lcov` report. Github actions example:
```yml
- name: Analyze with SonarCloud
    uses: sonarsource/sonarcloud-github-action@master
    env: 
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    with:
        projectBaseDir: ./
        args: >
        -Dsonar.organization=cenfun
        -Dsonar.projectKey=monocart-coverage-reports
        -Dsonar.projectName=monocart-coverage-reports
        -Dsonar.javascript.lcov.reportPaths=docs/mcr/lcov.info
        -Dsonar.sources=lib
        -Dsonar.tests=test
        -Dsonar.exclusions=dist/*,packages/*
```

## Contributing
- Latest Node.js 24 LTS recommended for development; minimum package runtime is 22.15.0. Development tools may require a newer patch than the minimum runtime.
- VSCode (extensions: eslint/stylelint/vue)
```sh
npm install
npx playwright install --with-deps

npm run build
npm run lint
npm run test

npm run dev
```
README JavaScript examples are checked with the project's ESLint configuration via `npm run lint:readme` and `npm run lint`. Only `no-undef` and `no-unused-vars` are disabled for snippets that omit surrounding context; syntax, style, and other correctness rules remain enabled. Use `ts` fences for TypeScript declarations and `text` for diagrams. For intentionally nonstandard syntax demonstrations, keep `js` highlighting and wrap the region in standalone `<!-- readme-lint-disable -->` / `<!-- readme-lint-enable -->` comments. Such regions are neither linted nor autofixed. Markers must be paired and cannot be nested; markers inside code fences are treated as example text.

```sh
npm run lint:readme
npm run lint:readme -- --fix
```

- Refreshing `eol=lf` for snapshot of test (Windows)
```sh
git add . -u
git commit -m "Saving files before refreshing line endings"

npm run eol
```

## Thanks
- [@bcoe](https://github.com/bcoe)
- [@edumserrano](https://github.com/edumserrano)


![Monocart Coverage Reports](./assets/og-image.png)