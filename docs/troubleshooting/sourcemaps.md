# Sourcemaps and debugging {#sourcemaps-and-debugging}
> Sometimes, the coverage is not what we expect. The next step is to figure out why, and we can easily find out the answer step by step through debugging.

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
When `logging` is `debug`, the raw report data is preserved in `[outputDir]/.cache` (or `[outputDir]/raw` if the `raw` report is used). The dist file is also kept in the V8 list, so you can open the browser's devtools and visually verify the coverage data.
![](/images/debug-coverage.png)

## Inspect sourcemaps {#inspect-sourcemaps}

Check sourcemaps with [Source Map Visualization](https://evanw.github.io/source-map-visualization/).

![](/images/debug-sourcemap.png)

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
process.env.MCR_LOG_TIME = true;
```
