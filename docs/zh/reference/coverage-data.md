# V8 覆盖率数据 {#v8-coverage-data-api}
- [JavaScript V8代码覆盖官方说明](https://v8.dev/blog/javascript-code-coverage)
- [Playwright的覆盖率接口](https://playwright.dev/docs/api/class-coverage)
- [Puppeteer的覆盖率接口](https://pptr.dev/api/puppeteer.coverage)
- [DevTools Protocol的覆盖率接口](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) 参见 [ScriptCoverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-ScriptCoverage) 和 [v8-coverage](https://github.com/bcoe/v8-coverage)
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

> MCR 为每个 V8 覆盖率条目扩展了以下字段：

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| `url` | `string` | 脚本 URL 或文件路径 |
| `type` | `"js" \| "css"` | 条目类型 |
| `source` | `string` | （JS）源代码文本 |
| `sourceMap` | `object` | （JS）已解析的 sourcemap 对象 |
| `scriptOffset` | `number` | （JS）脚本包裹层的字节偏移（例如 `vm` 模块中）。此偏移会自动加到所有 range 的 start/end 值上 |
| `distFile` | `string` | （JS）该 source 解包自的 dist 打包文件 |
| `empty` | `boolean` | 当条目通过 `all` 选项添加（无真实覆盖率数据）时标记为 `true`，显示为 0% 覆盖 |
| `fake` | `boolean` | 当源代码非原始代码（例如从 `.ts`/`.jsx` 编译而来）时标记为 `true`。AST 解析器会跳过 fake 源的覆盖率提取 |

这些字段可以在 [`onEntry`](/zh/reference/hooks#hooks) 钩子中读取或修改。
