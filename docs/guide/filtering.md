# Filtering {#filtering-results}
## Using `entryFilter` and `sourceFilter` to filter the results for V8 report {#using-entryfilter-and-sourcefilter-to-filter-the-results-for-v8-report}
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

## Using `filter` instead of `entryFilter` and `sourceFilter` {#using-filter-instead-of-entryfilter-and-sourcefilter}
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

## Using `outputFilter` to filter final files {#using-outputfilter-to-filter-final-files}
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
