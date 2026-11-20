# V8 覆盖率数据 {#v8-coverage-data}

本页说明运行时采集的原始 V8 数据与 MCR 覆盖率条目的关系。公共 TypeScript 类型统一在[类型声明](/zh/reference/types#type-declarations)页面维护。

首次接触 `coverageData` 和 `coverageResults`？先看[快速开始中的数据来源与返回结果说明](/zh/getting-started/get-started#coverage-data)。如何获得本页介绍的条目，参见 [V8 采集](/zh/coverage-collection/v8)。

## MCR 覆盖率条目 {#coverage-entries}

完整字段和类型参见 [`V8CoverageEntry`](/zh/reference/types#v8coverageentry)，不在本页重复声明。JavaScript 条目包含 `functions` 和源码 `source`；CSS 条目包含 `ranges` 和样式文本 `text`。

除原始覆盖率数据外，MCR 还支持以下辅助信息：

- `sourceMap`：已解析的 sourcemap 对象，用于将覆盖率映射回原始源码。
- `scriptOffset`：脚本包裹层的源码偏移（例如 `vm` 模块中），会自动应用到覆盖范围的起止偏移。
- `distFile`：该源码解包自的 dist 打包文件。
- `empty`：通过 `all` 选项添加、没有真实覆盖率数据的条目，显示为 0% 覆盖。
- `fake`：标记并非原始源码的内容（例如由 `.ts`/`.jsx` 编译而来），AST 解析器会跳过 fake 源的覆盖率提取。

可在 [`onEntry`](/zh/reference/hooks#onentry) 钩子中读取或修改条目。未测试文件的处理方式参见[未测试文件](/zh/reference/untested-files#untested-files)。

## 原始 V8 数据格式 {#raw-v8-data}

以下结构描述 V8/CDP 返回的原始 JavaScript 覆盖率数据；`integer` 和 `Runtime.ScriptId` 是协议中的类型记法。MCR 的 `V8CoverageEntry` 对这类条目添加源码和其他辅助字段。

注意：这里的原始 `CoverageRange` 使用 `startOffset`、`endOffset`，不同于 MCR 转换后的 [`CoverageRange`](/zh/reference/types#coveragerange)（使用 `start`、`end`），不能相互替代。

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

## 运行环境支持 {#runtime-support}

### 浏览器 {#browsers}

数据来源：[StatCounter Global Stats，2026 年 10 月](https://gs.statcounter.com/browser-market-share#monthly-202610-202610-bar)，范围为全球、全平台（桌面、手机、平板及游戏主机）。百分比是**网页浏览量使用份额**，不是用户数或安装量占比；统计方法参见[来源说明](https://gs.statcounter.com/faq#methodology)。查阅日期：**2026-11-17**。

| 浏览器 | 引擎 | 全球网页浏览量份额 | 原生 V8 采集 | 说明 |
| :-- | :-- | --: | :--: | :-- |
| Chrome | V8 | 68.79% | ✅ | 使用 Chromium/V8 的版本，例如桌面版和 Android 版 |
| Safari | JavaScriptCore | 16.59% | ❌ | WebKit / JavaScriptCore，不使用 V8 |
| Edge | V8 | 5.36% | ✅ | 使用 Chromium/V8 的版本 |
| Firefox | SpiderMonkey | 2.57% | ❌ | Gecko / SpiderMonkey，不使用 V8 |
| Opera | V8 | 2.16% | ✅ | 使用 Chromium/V8 的版本，不包括 Opera Mini |
| Samsung Internet | V8 | 2.05% | ✅ | Android 上使用 Chromium/V8 的版本 |

百分比按浏览器品牌跨平台统计；✅ 仅适用于采用 V8、且有可用覆盖率/CDP 接口的版本，不代表该品牌所有平台或版本均支持（例如使用 WebKit 的 iOS 版本）。此标记也不表示所有浏览器均已通过 MCR 测试。不要将这些品牌份额直接相加，当作 V8 引擎的市场份额。采集方式参见[浏览器采集](/zh/coverage-collection/v8#browser)和 [CDPClient](/zh/reference/cdp-client#cdpclient)。

### 非浏览器运行时 {#non-browser-runtimes}

数据来自 [State of JS 2025](https://2025.stateofjs.com/en-US/other-tools/#runtimes) 的运行时多选题（11,141 名回答者，[2026 年 2 月发布](https://2025.stateofjs.com/en-US/about/)）。百分比为**调查使用率，非市占率**，不能相加或与浏览器份额直接比较。查阅日期：2026-11-17。

| 运行时 | 引擎 | 调查使用率 | 原生 V8 采集（MCR） | MCR 说明 |
| :-- | :-- | --: | :--: | :-- |
| Node.js | V8 | 90.32% | ✅ | 支持原生 V8 覆盖率。参见 [Node.js 采集](/zh/coverage-collection/v8#nodejs)。 |
| Bun | JavaScriptCore | 20.83% | ❌ | 已部分实现 V8 兼容的覆盖率接口，但与 MCR 的兼容性仍未确认。进展参见 [issue #22128](https://github.com/oven-sh/bun/issues/22128)；[#30968](https://github.com/oven-sh/bun/issues/30968) 已作为重复 issue 关闭。 |
| Deno | V8 | 11.17% | ❌ | 无法导出 MCR 所需的完整 raw V8 覆盖率数据，缺少匹配的转译后源码和 sourcemap。参见 [issue #23359](https://github.com/denoland/deno/issues/23359)。 |

## 参考资料 {#resources}

- [JavaScript V8代码覆盖官方说明](https://v8.dev/blog/javascript-code-coverage)
- [Playwright的覆盖率接口](https://playwright.dev/docs/api/class-coverage)
- [Puppeteer的覆盖率接口](https://pptr.dev/api/puppeteer.coverage)
- [DevTools Protocol的覆盖率接口](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) 参见 [ScriptCoverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-ScriptCoverage) 和 [v8-coverage](https://github.com/bcoe/v8-coverage)
