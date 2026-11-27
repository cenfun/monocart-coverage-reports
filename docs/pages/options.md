# Configuration options {#configuration-options}

Browse options by feature, or use the on-page outline to jump to an individual option. General options belong to [`CoverageReportOptions`](/pages/types#coveragereportoptions); CLI and test runner options belong to [`McrCliOptions`](/pages/types#mcrclioptions).

- Default configuration: [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
- Type declarations: [lib/index.d.ts](/pages/types#type-declarations)
- Configuration loading and examples: [Configuration files](/pages/configuration#configuration-files)

If you already have a [configuration file](/pages/configuration#configuration-files), merge the example properties into it. Otherwise, copy an example into `mcr.config.mjs` at the project root and adjust the sample paths. To combine ESM examples, use a single `export default` object. See [module format](/pages/configuration#module-format) for CommonJS.

## Report output {#report-output}

### `name` {#name}

- **Type:** `string`
- **Default:** `"Coverage Report"`

Report title shown in the UI and summary reports.

### `reports` {#reports}

- **Type:** `string | (string | ReportDescription)[]`
- **Default:** `""` (auto)

Generate a browser report and a terminal summary from the same V8 run.

```js
export default {
    reports: [
        ['v8', {
            outputFile: 'browser.html'
        }],
        'console-summary'
    ]
};
```

::: tip Auto selection
An empty `reports` uses `v8` for V8 input and `html` for Istanbul input. Use a `[name, options]` tuple for [per-report settings](/pages/types#reportdescription); see [available reports](/pages/reports#reports).
:::

### `outputDir` {#outputdir}

- **Type:** `string`
- **Default:** `"./coverage-reports"`

Output directory for all reports and the `.cache` folder.

### `reportPath` {#reportpath}

- **Type:** `string | (() => string)`
- **Default:** `null`

When generating both V8 HTML and JSON, point downstream tools to the JSON report instead of the default HTML report.

```js
export default {
    reports: ['v8', 'v8-json'],
    reportPath: 'coverage-report.json'
};
```

::: warning This does not rename files
`reportPath` changes the entry path returned in the results, not the files written to disk. A relative path is resolved from `outputDir`; use `outputFile` to name the V8 HTML file.
:::

### `lcov` {#lcov}

- **Type:** `boolean`
- **Default:** `false`

Also generate `lcov.info` (equivalent to adding the `lcovonly` report).

### `watermarks` {#watermarks}

- **Type:** `[number, number] | object`
- **Default:** `[50, 80]`

Use different report colors for line coverage below 70%, from 70% to below 90%, and at 90% or above.

```js
export default {
    watermarks: {
        lines: [70, 90]
    }
};
```

::: warning Colors, not a CI gate
[`Watermarks`](/pages/types#watermarks) contains `[low, high]` percentages. To make low coverage fail CI, use a [coverage threshold hook](/pages/hooks#coverage-thresholds).
:::

## Inputs and source paths {#inputs-and-paths}

### `inputDir` {#inputdir}

- **Type:** `string | string[]`
- **Default:** `null`

Merge separately exported unit and end-to-end coverage into one report.

```js
export default {
    inputDir: ['./coverage-reports/unit/raw', './coverage-reports/e2e/raw'],
    outputDir: './coverage-reports/merged'
};
```

::: warning Check every input before merging
Pass directories exported by the `raw` report, not HTML or LCOV output. Use the same input format (V8 or Istanbul) for all runs. Missing directories are skipped, so verify each artifact exists before [merging](/pages/merging#manual-merging).
:::

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

When the client and server builds give the same source file different prefixes, rewrite both to one report path before merging coverage.

```js
export default {
    sourcePath: {
        'client-build/src/': 'src/',
        'server-build/src/': 'src/'
    }
};
```

::: tip Report path only
This does not change where MCR loads missing sources. For unusual V8 paths, use a [callback with `info.url`](/pages/source-path#path-normalization) to inspect the original URL.
:::

## Filtering and scope {#filtering-and-scope}

### `entryFilter` {#entryfilter}

- **Type:** `string | object | function`
- **Default:** `null`

With V8 input, keep the application bundle by matching its collected URL before sourcemap processing.

```js
export default {
    entryFilter: '**/dist/main.js'
};
```

::: warning Dropping a bundle drops its sources
If application and dependency code share the bundle, keep it and narrow the scope with [`sourceFilter`](#sourcefilter). When matching URLs, account for any query string. See the [filtering stages](/pages/filtering#filtering-pipeline).
:::

### `sourceFilter` {#sourcefilter}

- **Type:** `string | object | function`
- **Default:** `null`

With V8 input, keep application sources under `src/` when the sourcemap also contains dependency files.

```js
export default {
    sourceFilter: '**/src/**'
};
```

::: tip Match source paths, not bundle URLs
The paths are normalized and include any [`sourcePath`](#sourcepath) rewrites. To filter the final report file list instead, use [`outputFilter`](#outputfilter).
:::

### `filter` {#filter}

- **Type:** `string | object | function`
- **Default:** `null`

Reuse the same dependency exclusion for entry URLs and source paths.

```js
export default {
    filter: {
        '**/node_modules/**': false,
        '**/*': true
    }
};
```

::: tip Fallback, not an extra rule
`entryFilter` and `sourceFilter` each use `filter` only if their own setting is unset. Pattern objects use the first match, so put exclusions before the catch-all rule. This does not set `outputFilter`.
:::

### `outputFilter` {#outputfilter}

- **Type:** `string | object | function`
- **Default:** `null`

With V8 input, keep only the files under `src/` as they appear in the final report.

```js
export default {
    outputFilter: (file) => file.sourcePath.startsWith('src/')
};
```

::: tip Filtering happens after conversion
The callback receives a [`CoverageFile`](/pages/types#coveragefile), not a path string. This does not skip conversion work, restore files dropped by earlier filters, or change [raw exports](/pages/reports#raw). See [filtering trade-offs](/pages/filtering#filtering-approaches).
:::

### `all` {#all}

- **Type:** `string | string[] | object`
- **Default:** `null`

Count untested JavaScript files under `src/` as 0% covered instead of leaving them out of the report.

```js
export default {
    all: {
        dir: './src',
        filter: '**/*.js'
    }
};
```

::: tip Check your other filters
For V8 input, untested files also go through `sourceFilter` and can still be removed by `outputFilter`. See [untested files](/pages/untested-files#untested-files) for file types and transforms.
:::

### `v8Ignore` {#v8ignore}

- **Type:** `boolean`
- **Default:** `true`

(V8 only) Enable/disable comment-based ignoring (`v8 ignore …`). See [Ignoring Uncovered Codes](/pages/ignoring-code#ignoring-code).

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

::: warning Use a dedicated output directory
Because `clean` is enabled by default, never point `outputDir` at source files, raw merge inputs, or another task’s output.
:::

### `cleanCache` {#cleancache}

- **Type:** `boolean`
- **Default:** `false`

Start with an empty cache when initializing a report instance for an independent run.

```js
export default {
    outputDir: './coverage-reports/local',
    cleanCache: true
};
```

::: warning Keep shared caches intact
The CLI clears its cache before running a child command or merging reports. For [cross-process collection](/pages/multiprocessing#multiple-processes), do not clear a shared cache or generate before all producers finish. After successful generation, non-debug mode removes the cache regardless of `clean` and `cleanCache`; use `logging: "debug"` to retain it or export a [`raw` report](/pages/reports#raw) for later merging.
:::

### `gc` {#gc}

- **Type:** `number`
- **Default:** `null`

Memory threshold in MB; force GC at critical stages when JavaScript heap usage (`heapUsed`) exceeds it. Useful for very large data sets, see [JavaScript heap out of memory](/pages/common-issues#javascript-heap-out-of-memory).

## Sourcemaps and diagnostics {#sourcemaps-and-diagnostics}

### `logging` {#logging}

- **Type:** `"off" | "error" | "info" | "debug"`
- **Default:** `"info"`

Logging level ([`LoggingType`](/pages/types#loggingtype)). Use `"debug"` to keep raw cache and dump sourcemaps for troubleshooting. See [Sourcemaps and debugging](/pages/sourcemaps#sourcemaps-and-debugging).

### `sourceMap` {#sourcemap}

- **Type:** `boolean`
- **Default:** `false`

Save source and sourcemap files when investigating unexpected V8 coverage ranges.

```js
export default {
    logging: 'debug',
    sourceMap: true
};
```

::: warning Debug logging is required
`sourceMap: true` alone does not save these files. Debug artifacts can contain source code, internal paths, and test results; review them before sharing. See [sourcemap debugging](/pages/sourcemaps#export-debug-files).
:::

### `sourceMapResolver` {#sourcemapresolver}

- **Type:** `(url, defaultResolver) => Promise<string | object>`
- **Default:** `null`

Use a local build artifact when the sourcemap URL for a deployed bundle is not reachable.

```js
import { readFile } from 'node:fs/promises';

export default {
    sourceMapResolver: (url, defaultResolver) => {
        if (url === 'https://example.com/assets/app.js.map') {
            return readFile(new URL('./build/app.js.map', import.meta.url), 'utf8');
        }
        return defaultResolver(url);
    }
};
```

::: warning Match the tested build
Replace the sample URL and file path with your own. Use the exact sourcemap from the tested build, with the original sources embedded in `sourcesContent`: reading the map from disk does not make MCR resolve its relative sources from that local directory. Call `defaultResolver(url)` for URLs you do not handle.
:::

## Hooks {#hooks}

### `onEntry` {#onentry}

- **Type:** `(entry) => void | Promise<void>`
- **Default:** `null`

(V8 only) Per-entry hook. Parameter: [`entry`](/pages/types#v8coverageentry). See [Hooks](/pages/hooks#hooks).

### `onEnd` {#onend}

- **Type:** `(coverageResults: CoverageResults | undefined) => void | Promise<void>`
- **Default:** `null`

Read the line coverage summary from [`coverageResults`](/pages/types#coverageresults) after generating reports.

```js
export default {
    onEnd: (results) => {
        if (results) {
            console.log(results.summary.lines);
        }
    }
};
```

::: warning Do not use the hook as proof of success
With no usable input, `generate()` may return `undefined` without calling `onEnd`. Check the return value in API code; see [coverage thresholds](/pages/hooks#coverage-thresholds) for CI gates.
:::

## CLI and test runner {#cli-and-tests}

These options apply to CLI configuration, not API calls. Configure function options in a configuration file rather than passing them as command-line flags.

### `test` {#test}

- **Type:** `string | string[] | null`
- **Default:** `null`

Set default targets so running `npx mcr test` picks up both test suites without positional arguments.

```js
export default {
    test: ['test/unit/*.test.js', 'test/integration/*.test.js']
};
```

::: tip CLI targets replace these defaults
A string is one argument to `node --test`; use an array for multiple paths or globs. With no CLI targets, `null`, an empty string, or `[]` skips tests. Other commands and API calls ignore this option. See [Run tests with mcr test](/pages/node-test-runner).
:::

### `onStart` {#onstart}

- **Type:** `(coverageReport: CoverageReport) => void | Promise<void>`
- **Default:** `undefined` (not configured)

CLI only: runs before the child process starts. Parameter: [`coverageReport`](/pages/types#coveragereport). See [`onStart`](/pages/hooks#onstart).

### `onReady` {#onready}

- **Type:** `(coverageReport: CoverageReport, nodeV8CoverageDir: string, subprocess: any) => void | Promise<void>`
- **Default:** `undefined` (not configured)

CLI only: runs after the child exits, before coverage data is read. Parameter: [`coverageReport`](/pages/types#coveragereport). See [`onReady`](/pages/hooks#onready).

### `onTestEnd` {#ontestend}

- **Type:** `(testResults: TestResults) => void | Promise<void>`
- **Default:** `null`

Print a summary of the collected Node.js test results before `mcr test` publishes them and generates coverage.

```js
export default {
    test: './test/**/*.test.js',
    onTestEnd: (results) => {
        console.log(results.summary);
    }
};
```

::: tip Test results are collected even without this hook
This hook is only for `mcr test` and runs before `onReady`. Raw reports and debug caches can include test names and errors. See [`onTestEnd`](/pages/hooks#ontestend) for the [result type](/pages/types#testresults) and [redaction guidance](/pages/hooks#sensitive-data).
:::
