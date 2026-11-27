# Sourcemaps and debugging {#sourcemaps-and-debugging}

## Quick diagnosis {#quick-diagnosis}

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Covered lines or branches do not match what ran | Coverage ranges, generated code, sourcemap, or original source may come from different builds. | Verify that all four come from the exact build that ran. If they match, [inspect the sourcemap](#inspect-sourcemaps) at one unexpected range. |
| Source content is correct, but the report shows an unexpected path | A virtual or build-specific path in the sourcemap was not normalized as expected. | Use [`sourcePath`](/pages/source-path#path-normalization) to rewrite the report path without changing where MCR loads sources. |
| The report shows only generated code | MCR may not have found a usable map or the original source content. | Check the map URL and whether the map includes `sourcesContent` or points to readable local sources. [Enable debug logging](#enable-debugging) to compare the coverage with the build artifacts. |
| No separate source and map files appear in the debug output | Debug logging alone does not export them, a `raw` report moved them, or MCR had no sourcemap to save. | Set [`logging: 'debug'` and `sourceMap: true`](#export-debug-files). Look in `outputDir/.cache` or the configured raw output location. If the files are still missing, check that the build emits a usable sourcemap. |

If a file is missing entirely or no report was generated, start with [common issues](./common-issues#unexpected-coverage). For stylesheet-specific symptoms, see [CSS coverage issues](./css-coverage-issues#quick-diagnosis).

## Enable debugging {#enable-debugging}

Start debugging the V8 report with `logging: 'debug'`.

```js
const coverageOptions = {
    logging: 'debug',
    reports: [
        ['v8'],
        ['console-details']
    ]
};
```
Debug mode keeps raw coverage in `outputDir/.cache`. If you also generate a [`raw` report](/pages/reports#raw), the cache moves to the raw output location (`outputDir/raw` by default). The V8 report also keeps the generated file so you can compare coverage ranges in the generated and original code.

![Generated code and coverage ranges in the V8 report](/images/debug-coverage.png)

## Inspect sourcemaps {#inspect-sourcemaps}

Pick an unexpected range and use [Source Map Visualization](https://github.com/evanw/source-map-visualization) to compare the generated line and column with the mapped original position. If the source content is correct but the path looks wrong, see [source path rewrites](/pages/source-path). Debug files can contain source code, paths, and test results; [review them before sharing](/pages/merging#raw-artifact-safety).

![Sourcemap visualization comparing generated and original positions](/images/debug-sourcemap.png)

## Export debug files {#export-debug-files}

Generate additional source and sourcemap files in the cache or raw directory.

```js
const coverageOptions = {
    logging: 'debug',
    sourceMap: true
};
```

## View timing logs {#view-timing-logs}

Show timing logs with the environment variable `MCR_LOG_TIME`.

```js
process.env.MCR_LOG_TIME = '1';
```
