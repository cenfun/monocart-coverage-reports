# V8 coverage data {#v8-coverage-data-api}
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

> MCR extends each V8 coverage entry ([`V8CoverageEntry`](/reference/types#v8coverageentry)) with additional fields:

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

These fields can be read/mutated in [`onEntry`](/reference/hooks#hooks) hooks.
