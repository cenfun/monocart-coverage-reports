# Sourcemaps and debugging {#sourcemaps-and-debugging}

If covered lines or branches do not match what ran, check that the coverage data, generated code, sourcemap, and original source come from the same build before enabling debug logging. For missing files or reports, start with [common issues](/troubleshooting/common-issues#unexpected-coverage).

For CSS-specific troubleshooting, see [CSS coverage issues](/troubleshooting/css-coverage-issues).

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
Debug mode keeps raw coverage in `outputDir/.cache`. If you also generate a [`raw` report](/reference/reports#raw), the cache moves to the raw output location (`outputDir/raw` by default). The V8 report also keeps the generated file so you can compare coverage ranges in the generated and original code.

![Generated code and coverage ranges in the V8 report](/images/debug-coverage.png)

## Inspect sourcemaps {#inspect-sourcemaps}

Pick an unexpected range and use [Source Map Visualization](https://github.com/evanw/source-map-visualization) to compare the generated line and column with the mapped original position. If the source content is correct but the path looks wrong, see [source path rewrites](/reference/source-path). Debug files can contain source code, paths, and test results; [review them before sharing](/reference/merging#raw-artifact-safety).

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
