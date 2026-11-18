# V8 与 Istanbul 对比 {#v8-vs-istanbul}
> 如果是V8数据格式使用Istanbul的报告，将自动从V8转换到Istanbul

| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| 数据格式 | [Istanbul](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md) (Object) | [V8](/zh/reference/coverage-data#v8-coverage-data) (Array) | [V8](/zh/reference/coverage-data#v8-coverage-data) (Array) |
| 输出报告 | [Istanbul reports](/zh/reference/reports#reports) | [V8 reports](/zh/reference/reports#reports)  | [Istanbul reports](/zh/reference/reports#reports) |
| - Bytes 字节覆盖率 | ❌ | ✅ | ❌ |
| - Statements 语句覆盖率 | ✅ | ✅ | ✅ |
| - Branches 分支覆盖率 | ✅ | ✅ | ✅ |
| - Functions 函数覆盖率 | ✅ | ✅ | ✅ |
| - Lines 行覆盖率 | ✅ | ✅ | ✅ |
| - Execution counts 函数执行数 | ✅ | ✅ | ✅ |
| CSS 覆盖率 | ❌ | ✅ | ✅ |
| 压缩过的代码 | ❌ | ✅ | ❌ |

## 如何选择 {#choosing-a-collection-method}

### V8：无需插桩 {#v8-tradeoffs}

- **优势：** 直接采集运行时覆盖率，无需修改被测代码。
- **限制：** 依赖提供覆盖率接口的 V8 运行环境，如 Node.js、Chromium；编译或打包后的代码需配套 sourcemap 才能映射回源码。

参见 [V8 采集](/zh/coverage-collection/v8)、[Sourcemap 与调试](/zh/troubleshooting/sourcemaps)、[V8 覆盖率数据](/zh/reference/coverage-data#v8-coverage-data)。

### Istanbul：跨引擎采集 {#istanbul-tradeoffs}

- **优势：** 不依赖特定浏览器的原生覆盖率接口，适合跨引擎 JavaScript 测试。
- **限制：** 需要在构建或测试准备阶段插桩，并运行插桩后的代码，增加配置和执行开销。

::: warning 插桩的问题
插桩通常依赖与构建工具匹配的插件或转换步骤。Webpack + Babel 等方案已有较成熟的接入方式，但不同构建工具的支持程度并不一致，新工具未必有可直接使用的插桩插件。

纯 JavaScript 能正常插桩，不代表 TypeScript、Vue 单文件组件或 React JSX/TSX 也能直接适用；还需确认插件对语法转换、执行顺序和 sourcemap 链路的兼容性，必要时补充配置或自定义转换。

插桩会为语句、分支和函数添加计数器及辅助代码，并在运行时更新统计。插桩点较多时，生成的代码体积可能显著增大，也可能影响加载和执行性能，尤其是频繁执行的代码路径。具体开销取决于插桩范围和实际负载。
:::

构建集成方式参见 [Istanbul 采集](/zh/coverage-collection/istanbul#build)。

### 使用 MCR 原生报告 {#native-v8-reports}

环境支持时，**MCR 优先推荐使用原生 V8 覆盖率数据**，配合[原生 `v8` 报告](/zh/reference/reports#v8-reports)：无需插桩或转换为 Istanbul，保留 **Bytes 指标**，还可展示通过 Chromium 浏览器 / CDP 接口采集的 **CSS 覆盖率**。

V8 早在 [2017 年](https://v8.dev/blog/javascript-code-coverage)就已支持原生 JavaScript 覆盖率，背景介绍参见[这篇文章](https://gist.github.com/cenfun/0754c23f03d1aa541b4467920ab4d09f)。

Node.js 测试参见 [`mcr test`](/zh/getting-started/node-test-runner#quick-start)，浏览器测试参见 [Playwright 采集](/zh/coverage-collection/v8#playwright)。
