# Configuration options {#options}
- Default options: [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
- Options declaration see `CoverageReportOptions` [lib/index.d.ts](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/index.d.ts)
- [Config file](/guide/configuration#config-file)

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `logging` | `"off" \| "error" \| "info" \| "debug"` | `"info"` | Logging level. Use `"debug"` to keep raw cache and dump sourcemaps for troubleshooting. See [Debug for Coverage and Sourcemap](/troubleshooting/sourcemaps#debug-for-coverage-and-sourcemap). |
| `name` | `string` | `"Coverage Report"` | Report title shown in the UI and summary reports. |
| `reports` | `string \| (string \| ReportDescription)[]` | `""` (auto) | Reports to generate. Defaults to `"v8"` for V8 data and `"html"` for Istanbul data. See [Available Reports](/reference/reports#available-reports). |
| `outputDir` | `string` | `"./coverage-reports"` | Output directory for all reports and the `.cache` folder. |
| `inputDir` | `string \| string[]` | `null` | Input directories of raw coverage data for [merging](/guide/merging#merge-coverage-reports). |
| `baseDir` | `string` | `process.cwd()` | Base dir used to normalize relative source paths. Set when the report is generated from a different working directory than the sources. |
| `dataDir` | `string` | `null` | Coverage data directory loaded automatically in `generate()` — alternative to `addFromDir()`. |
| `entryFilter` | `string \| object \| function` | `null` | (V8 only) Filter V8 entries by url. See [Filtering Results](/guide/filtering#filtering-results). |
| `sourceFilter` | `string \| object \| function` | `null` | (V8 only) Filter sources unpacked from sourcemaps. |
| `outputFilter` | `string \| object \| function` | `null` | (V8 only) Filter final files by `sourcePath` after sourcemap conversion. See [Filtering Results](/guide/filtering#filtering-results). |
| `filter` | `string \| object \| function` | `null` | Combined filter replacing both `entryFilter` and `sourceFilter`. |
| `sourcePath` | `object \| function` | `null` | Rewrite source paths; see [Resolve `sourcePath`](/guide/source-path#resolve-sourcepath-for-the-source-files). |
| `all` | `string \| string[] \| object` | `null` | Include untested files as empty coverage. See [Adding Empty Coverage](/guide/untested-files#adding-empty-coverage-for-untested-files). |
| `outputFile` | `string` | `"index.html"` | (V8 only) Output `[sub dir/]filename` for the V8 report. |
| `inline` | `boolean` | `false` | (V8 only) Inline all assets into a single HTML file. |
| `assetsPath` | `string` | `"./assets"` | (V8 only) Assets directory when `inline` is false. |
| `lcov` | `boolean` | `false` | Also generate `lcov.info` (equivalent to adding the `lcovonly` report). |
| `v8Ignore` | `boolean` | `true` | (V8 only) Enable/disable comment-based ignoring (`v8 ignore …`). See [Ignoring Uncovered Codes](/guide/ignoring-code#ignoring-uncovered-codes). |
| `reportPath` | `string \| () => string` | `null` | Override the report entry path (defaults to `outputDir/index.html`). Useful when multiple reports share an `outputDir`. |
| `watermarks` | `[number, number] \| object` | `[50, 80]` | Low/high thresholds (percent). Accepts per-metric object like `{ bytes:[50,80], lines:[50,80] }`. |
| `clean` | `boolean` | `true` | Clean previous reports in `outputDir` before generating (the `.cache` dir is preserved unless `cleanCache` is also `true`). |
| `cleanCache` | `boolean` | `false` | Clean the cache dir on start. When both `clean` and `cleanCache` are `false`, cached coverage data from previous runs is preserved and can be reused across processes. |
| `gc` | `number` | `null` | Memory threshold in MB; force GC at critical stages when JavaScript heap usage (`heapUsed`) exceeds it. Useful for very large data sets, see [JavaScript heap out of memory](/troubleshooting/common-issues#javascript-heap-out-of-memory). |
| `sourceMap` | `boolean` | `false` | Save source/sourcemap files to cache for debugging (requires `logging: "debug"`). |
| `sourceMapResolver` | `(url, defaultResolver) => Promise<string \| object>` | `null` | Custom sourcemap loader (e.g. from a build cache). Call `defaultResolver(url)` to fall back. |
| `onEntry` | `(entry) => void \| Promise<void>` | `null` | (V8 only) Per-entry hook; see [Hooks](/reference/hooks#hooks). |
| `onEnd` | `(coverageResults) => void \| Promise<void>` | `null` | Hook invoked after report generation; see [Hooks](/reference/hooks#hooks). |
