# V8 coverage data {#v8-coverage-data}

This page distinguishes raw V8 data collected at runtime from MCR coverage entries. Public TypeScript types are maintained on the [Type declarations](/pages/types#type-declarations) page.

New to `coverageData` and `coverageResults`? Start with [data sources and return values in Get started](/pages/get-started#coverage-data). To obtain the entries described here, see [V8 collection](/pages/v8).

## MCR coverage entries {#coverage-entries}

See [`V8CoverageEntry`](/pages/types#v8coverageentry) for the complete fields and types, rather than duplicating the declaration here. JavaScript entries contain `functions` and source text in `source`; CSS entries contain `ranges` and stylesheet text in `text`.

In addition to raw coverage data, MCR supports the following metadata:

- `sourceMap`: a parsed sourcemap object for mapping coverage back to original sources.
- `scriptOffset`: the source offset of a script wrapper (for example, in `vm` modules), automatically applied to coverage range start/end offsets.
- `distFile`: the dist bundle this source was unpacked from.
- `empty`: marks entries added through `all` without real coverage data, showing 0% coverage.
- `fake`: marks content that is not the original source (for example, compiled from `.ts`/`.jsx`); the AST parser skips coverage extraction for fake sources.

Read or mutate entries in the [`onEntry`](/pages/hooks#onentry) hook. See [Untested files](/pages/untested-files#untested-files) for handling files without collected coverage.

## Line classifications {#line-classifications}

In a V8 [`CoverageFile`](/pages/types#coveragefile), `data.extras` maps 1-based source line numbers to codes for lines excluded from line coverage. These codes are not hit counts:

| Code | Meaning |
| :-- | :-- |
| `b` | Blank line, including whitespace-only lines. |
| `c` | Comment-only line. |
| `i` | Line excluded by an [ignore directive](/pages/ignoring-code#ignoring-code). |

Blank and comment-only lines keep their classification even inside an ignored range. For example, a line containing only `/* node:coverage enable */` is `c`.

[`CoverageSnapshot`](/pages/types#coveragesnapshot) stores the same data as a comma-separated string: `{ "2": "b", "12": "c", "16": "i" }` becomes `"2b,12c,16i"`. The snapshot field is empty if there are no entries, including in Istanbul snapshots.

## Raw V8 data format {#raw-v8-data}

The following structures describe raw JavaScript coverage returned by V8/CDP; `integer` and `Runtime.ScriptId` are protocol type notation. MCR’s `V8CoverageEntry` adds source text and other metadata to these entries.

The raw `CoverageRange` below uses `startOffset` and `endOffset`. It is not interchangeable with MCR’s converted [`CoverageRange`](/pages/types#coveragerange), which uses `start` and `end`.

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

## Runtime support {#runtime-support}

### Browsers {#browsers}

Source: [StatCounter Global Stats, October 2026](https://gs.statcounter.com/browser-market-share#monthly-202610-202610-bar), worldwide, all platforms (desktop, mobile, tablet and console). These are **page-view usage shares**, not shares of people or installations; see the [methodology](https://gs.statcounter.com/faq#methodology). Retrieved on **2026-11-17**.

| Browser | Engine | Global page-view share | Native V8 collection | Notes |
| :-- | :-- | --: | :--: | :-- |
| Chrome | V8 | 68.79% | ✅ | Chromium/V8 builds, such as desktop and Android |
| Safari | JavaScriptCore | 16.59% | ❌ | WebKit / JavaScriptCore, not V8 |
| Edge | V8 | 5.36% | ✅ | Chromium/V8 builds |
| Firefox | SpiderMonkey | 2.57% | ❌ | Gecko / SpiderMonkey, not V8 |
| Opera | V8 | 2.16% | ✅ | Chromium/V8 builds; not Opera Mini |
| Samsung Internet | V8 | 2.05% | ✅ | Chromium/V8 on Android |

The percentages describe browser brands across platforms. The ✅ applies only to builds using V8 and an accessible coverage/CDP interface, not every platform or edition of that brand (for example, WebKit-based iOS builds). It does not imply that every listed browser has been tested with MCR. Do not add these brand percentages together to estimate V8 engine share. See [Browser collection](/pages/v8#browser) and [CDPClient](/pages/cdp-client#cdpclient) for collection methods.

### Non-browser runtimes {#non-browser-runtimes}

Source: [State of JS 2025](https://2025.stateofjs.com/en-US/other-tools/#runtimes), a multiple-choice runtime question with 11,141 respondents ([published February 2026](https://2025.stateofjs.com/en-US/about/)). Figures are **survey usage, not market share**; they cannot be added together or compared directly with browser shares. Retrieved: 2026-11-17.

| Runtime | Engine | Survey usage | Native V8 collection (MCR) | MCR notes |
| :-- | :-- | --: | :--: | :-- |
| Node.js | V8 | 90.32% | ✅ | Native V8 coverage is supported. See [Node.js collection](/pages/v8#nodejs). |
| Bun | JavaScriptCore | 20.83% | ❌ | V8-compatible coverage APIs are partially implemented, but MCR compatibility remains unconfirmed. Track [issue #22128](https://github.com/oven-sh/bun/issues/22128); [#30968](https://github.com/oven-sh/bun/issues/30968) was closed as a duplicate. |
| Deno | V8 | 11.17% | ❌ | Does not export the complete raw V8 coverage data needed by MCR: matching transpiled sources and sourcemaps are missing. See [issue #23359](https://github.com/denoland/deno/issues/23359). |

## Further reading {#resources}

- [JavaScript code coverage in V8](https://v8.dev/blog/javascript-code-coverage)
- [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
- [Puppeteer Coverage Class](https://pptr.dev/api/puppeteer.coverage)
- [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) see [ScriptCoverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-ScriptCoverage) and [v8-coverage](https://github.com/bcoe/v8-coverage)
