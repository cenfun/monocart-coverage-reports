# Configuration options {#configuration-options}

Browse options by feature, or use the on-page outline to jump to an individual option. General options belong to [`CoverageReportOptions`](/reference/types#coveragereportoptions); CLI and test runner options belong to [`McrCliOptions`](/reference/types#mcrclioptions).

- Default configuration: [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
- Type declarations: [lib/index.d.ts](/reference/types#type-declarations)
- Configuration loading and examples: [Configuration files](/reference/configuration#configuration-files)

## Report output {#report-output}

### `name` {#name}

- **Type:** `string`
- **Default:** `"Coverage Report"`

Report title shown in the UI and summary reports.

### `reports` {#reports}

- **Type:** `string | (string | ReportDescription)[]`
- **Default:** `""` (auto)

Reports to generate; see [`ReportDescription`](/reference/types#reportdescription) for per-report options. Defaults to `"v8"` for V8 data and `"html"` for Istanbul data. See [Available Reports](/reference/reports#reports).

### `outputDir` {#outputdir}

- **Type:** `string`
- **Default:** `"./coverage-reports"`

Output directory for all reports and the `.cache` folder.

### `reportPath` {#reportpath}

- **Type:** `string | (() => string)`
- **Default:** `null`

Override the report entry path (defaults to `outputDir/index.html`). Useful when multiple reports share an `outputDir`.

### `lcov` {#lcov}

- **Type:** `boolean`
- **Default:** `false`

Also generate `lcov.info` (equivalent to adding the `lcovonly` report).

### `watermarks` {#watermarks}

- **Type:** `[number, number] | object`
- **Default:** `[50, 80]`

Low/high thresholds (percent); see [`Watermarks`](/reference/types#watermarks) for the full type. Accepts per-metric object like `{ bytes:[50,80], lines:[50,80] }`. These values control report color bands, not pass/fail enforcement. See [Coverage thresholds](/reference/hooks#coverage-thresholds) for quality gates.

## Inputs and source paths {#inputs-and-paths}

### `inputDir` {#inputdir}

- **Type:** `string | string[]`
- **Default:** `null`

Input directories of raw coverage data for [merging](/reference/merging#merging-reports).

### `dataDir` {#datadir}

- **Type:** `string`
- **Default:** `null`

Coverage data directory loaded automatically in `generate()` — alternative to `addFromDir()`.

### `baseDir` {#basedir}

- **Type:** `string`
- **Default:** `null`

Base directory used to normalize relative source paths. The default `null` uses the current working directory (`process.cwd()`). Set this when reports are generated from a different working directory than the sources.

### `sourcePath` {#sourcepath}

- **Type:** `object | function`
- **Default:** `null`

Rewrite source paths; see [Resolve `sourcePath`](/reference/source-path#source-paths).

## Filtering and scope {#filtering-and-scope}

### `entryFilter` {#entryfilter}

- **Type:** `string | object | function`
- **Default:** `null`

(V8 only) Filter V8 entries by url. See [Filtering Results](/reference/filtering#filtering).

### `sourceFilter` {#sourcefilter}

- **Type:** `string | object | function`
- **Default:** `null`

(V8 only) Filter sources unpacked from sourcemaps.

### `filter` {#filter}

- **Type:** `string | object | function`
- **Default:** `null`

Combined filter replacing both `entryFilter` and `sourceFilter`. Does not configure `outputFilter`.

### `outputFilter` {#outputfilter}

- **Type:** `string | object | function`
- **Default:** `null`

(V8 only) Filter final files by `sourcePath` after sourcemap conversion. See [Filtering Results](/reference/filtering#filtering).

### `all` {#all}

- **Type:** `string | string[] | object`
- **Default:** `null`

Include untested files as empty coverage. See [Adding Empty Coverage](/reference/untested-files#untested-files).

### `typescript` {#typescript}

- **Type:** `boolean | object | function | null`
- **Default:** `null`

(V8 only) Native TS analysis policy. `null`, `undefined` and `{}` use conservative automatic detection; `true` forces eligible original TS analysis and `false` disables it. Object form: `{ enabled: boolean | (info) => boolean }`. Top-level `(info) => result` callbacks return final boolean/object/nullish settings. Callbacks are synchronous and file-specific; only one is called per eligible file. Existing transformed JS, sourcemaps and explicit `all.transformer` output keep their own workflows.

CLI overrides: `--typescript` / `--no-typescript`. See [TypeScript support](/reference/typescript#analysis-policy) for callback fields, raw behavior, validation and limitations.

### `v8Ignore` {#v8ignore}

- **Type:** `boolean`
- **Default:** `true`

(V8 only) Enable/disable comment-based ignoring (`v8 ignore …`). See [Ignoring Uncovered Codes](/reference/ignoring-code#ignoring-code).

## V8 HTML report {#v8-html}

### `outputFile` {#outputfile}

- **Type:** `string`
- **Default:** `"index.html"`

(V8 only) Output `[sub dir/]filename` for the V8 report.

### `inline` {#inline}

- **Type:** `boolean`
- **Default:** `false`

(V8 only) Inline all assets into a single HTML file.

### `assetsPath` {#assetspath}

- **Type:** `string`
- **Default:** `"./assets"`

(V8 only) Assets directory when `inline` is false.

## Cache and performance {#cache-and-performance}

### `clean` {#clean}

- **Type:** `boolean`
- **Default:** `true`

Clean previous reports in `outputDir` before generating. This cleanup skips `.cache`; it does not control cache cleanup during initialization or after generation.

### `cleanCache` {#cleancache}

- **Type:** `boolean`
- **Default:** `false`

Clean the cache directory when the report instance initializes. Setting this to `false` leaves existing cache data available at initialization, but does not guarantee that it survives `generate()`. CLI test and subprocess commands also explicitly clear their cache before starting collection.

For cross-process collection, share the cache while collecting and generate the report after all producers finish. After successful generation, non-debug mode removes the cache regardless of `clean` and `cleanCache`. Use `logging: "debug"` to retain it, or export a [`raw` report](/reference/reports#raw) and later merge the exported data through `inputDir`.

::: warning Cleanup scope
Use a dedicated report directory for `outputDir`, never a source directory, raw merge input, or another task's output. When sharing a cache across processes, do not let one process generate reports or clear the cache before all producers finish.
:::

### `gc` {#gc}

- **Type:** `number`
- **Default:** `null`

Memory threshold in MB; force GC at critical stages when JavaScript heap usage (`heapUsed`) exceeds it. Useful for very large data sets, see [JavaScript heap out of memory](/troubleshooting/common-issues#javascript-heap-out-of-memory).

## Sourcemaps and diagnostics {#sourcemaps-and-diagnostics}

### `logging` {#logging}

- **Type:** `"off" | "error" | "info" | "debug"`
- **Default:** `"info"`

Logging level ([`LoggingType`](/reference/types#loggingtype)). Use `"debug"` to keep raw cache and dump sourcemaps for troubleshooting. See [Sourcemaps and debugging](/troubleshooting/sourcemaps#sourcemaps-and-debugging).

### `sourceMap` {#sourcemap}

- **Type:** `boolean`
- **Default:** `false`

Save source/sourcemap files to cache for debugging (requires `logging: "debug"`).

### `sourceMapResolver` {#sourcemapresolver}

- **Type:** `(url, defaultResolver) => Promise<string | object>`
- **Default:** `null`

Custom sourcemap loader (e.g. from a build cache). Call `defaultResolver(url)` to fall back.

## Hooks {#hooks}

### `onEntry` {#onentry}

- **Type:** `(entry) => void | Promise<void>`
- **Default:** `null`

(V8 only) Per-entry hook. Parameter: [`entry`](/reference/types#v8coverageentry). See [Hooks](/reference/hooks#hooks).

### `onEnd` {#onend}

- **Type:** `(coverageResults: CoverageResults | undefined) => void | Promise<void>`
- **Default:** `null`

Hook invoked after report generation. Parameter: [`coverageResults`](/reference/types#coverageresults). See [Hooks](/reference/hooks#hooks).

## CLI and test runner {#cli-and-tests}

These options apply to CLI configuration, not API calls. Configure function options in a configuration file rather than passing them as command-line flags.

### `test` {#test}

- **Type:** `string | string[] | null`
- **Default:** `null`

Used only by `mcr test`. Test file paths or glob patterns passed to `node --test`; a string supplies one argument, and an array supplies multiple arguments. Positional CLI targets override this option. With no CLI targets, `null`, an empty string or `[]` skips tests. Other commands and the API ignore this option. See [Run tests with mcr test](/getting-started/node-test-runner).

### `onStart` {#onstart}

- **Type:** `(coverageReport: CoverageReport) => void | Promise<void>`
- **Default:** `undefined` (not configured)

CLI only: runs before the child process starts. Parameter: [`coverageReport`](/reference/types#coveragereport). See [`onStart`](/reference/hooks#onstart).

### `onReady` {#onready}

- **Type:** `(coverageReport: CoverageReport, nodeV8CoverageDir: string, subprocess: any) => void | Promise<void>`
- **Default:** `undefined` (not configured)

CLI only: runs after the child exits, before coverage data is read. Parameter: [`coverageReport`](/reference/types#coveragereport). See [`onReady`](/reference/hooks#onready).

### `onTestEnd` {#ontestend}

- **Type:** `(testResults: TestResults) => void | Promise<void>`
- **Default:** `null`

Used only by `mcr test`: runs after test results are collected, before result publication and coverage generation. Parameter: [`testResults`](/reference/types#testresults). Use it to process or redact test results; results are still collected when this hook is omitted. See [`onTestEnd`](/reference/hooks#ontestend).
