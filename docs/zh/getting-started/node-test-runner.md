# 使用 mcr test 运行测试 {#run-tests-with-mcr-test}

**MCR 3.x 重要更新：** 使用内置的 [Node.js 测试 runner](https://nodejs.org/docs/latest/api/test.html)，一条命令即可运行测试并自动生成覆盖率报告。

## 快速开始 {#quick-start}

安装 MCR 后，直接指定测试文件即可运行，无需配置文件：

```sh
npm i monocart-coverage-reports -D
npx mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
```

此命令会运行匹配的测试，在终端打印覆盖率摘要，并将 V8 HTML 报告写入 `./coverage-reports/index.html`。请为 glob 加引号，让 Node.js 而不是 shell 处理匹配。

## 命令行用法 {#command-line-usage}

```sh
# 运行配置中的测试目标
npx mcr test
# 覆盖配置中的测试目标，并在 -- 后透传 Node.js 测试 runner 参数
npx mcr test "./test/unit/**/*.test.js" -- --test-reporter=spec

# 显式指定配置文件
npx mcr test "../tests/**/*.test.js" -c ./mcr.config.js

# 在命令行选择报告
npx mcr test "../tests/**/*.test.js" -r v8,console-summary

# 运行多个测试文件
npx mcr test ./test/first.test.js ./test/second.test.js

# 按测试名称筛选，并指定 reporter
npx mcr test "../tests/**/*.test.js" -c ./mcr.config.js -- --test-name-pattern="my test" --test-reporter=spec

# 将 test 命令放在初始分隔符后
npx mcr -c ./mcr.config.js -- test "../tests/**/*.test.js" -- --test-reporter=spec
```

### 参数与优先级 {#options-and-precedence}

- 命令行指定的测试目标会**覆盖**配置中的 `test`，而不是追加；未指定命令行目标时才使用配置。命令行指定目标时可以不使用配置文件。
- 原有 MCR 参数（如 `-c`、`-r`、`-o`、`--lcov`）可以放在目标之前或之后。
- Node runner 参数请放在 `--` 后，原样透传，不作为 MCR 参数或目标覆盖项解析。建议为 glob 加引号，避免 shell 提前展开。
- 使用另一种 `mcr [options] -- test ...` 形式时，所有 MCR 参数必须放在第一个 `--` 前，Node runner 参数则放在第二个 `--` 后。

## 配置文件 {#configuration}

对于需要反复执行的测试，可将测试目标和覆盖率选项保存到 `mcr.config.js`。下面使用 ESM 导出语法；CommonJS 配置参见[配置文件的模块格式](/zh/reference/configuration#module-format)：

```js
export default {
    test: ['./test/unit/**/*.test.js', './test/integration/**/*.test.js'],
    reports: ['v8', 'console-summary'],
    outputDir: './coverage-reports'
};
```

配置类型参见 [`McrCliOptions`](/zh/reference/types#mcrclioptions)。

### onTestEnd {#ontestend}

如需在测试运行器退出后查看或修改结构化测试结果，可在 `mcr.config.js` 中配置 [`onTestEnd` hook](/zh/reference/hooks#ontestend)。参数 [`testResults`](/zh/reference/types#testresults) 的类型为 `TestResults`。结果字段、缓存与导出行为，以及敏感数据处理方式参见该 hook 的说明。

## 测试目标规则 {#test-targets}

- 测试目标原样传给 `node --test`。MCR 不检查目标类型或文件是否存在，不展开目录/glob，不解析或标准化路径，不转义特殊字符，也不去重；`node --test` 原生接收测试文件路径或 glob 形式的位置参数，而不是 JavaScript 配置对象。
- MCR 配置中的字符串表示一个这样的参数（不会按空格拆分），字符串数组表示多个按原顺序传递的参数；`null` 仅是 MCR 跳过测试的默认值，不会传给 Node。
- 测试发现、匹配、参数解释及错误行为均交给 Node。
- 相对路径以当前工作目录为基准，而不是配置文件目录。
- 不承诺直接指定目录会递归发现测试；递归匹配请使用 `"../tests/**/*.test.js"` 等 glob，行为以当前 Node 版本的原生支持为准。
- 原生 TypeScript 测试无需 loader：`mcr test "./test/**/*.test.ts"`。报告通过生成的 sourcemap 展示原始 TS；支持语法和限制参见[TypeScript 支持](/zh/reference/typescript#run-ts-tests)。

## 报告与退出状态 {#reports-and-exit-status}

- `test` 默认为 `null`；未指定命令行目标，且 `test` 未配置或为 `null`、空字符串、`[]` 时跳过测试，也不生成报告。
- MCR 仅判断是否提供了目标，无效或未匹配目标由 Node 自行处理。
- 如果没有产生覆盖率数据且无法生成报告，命令仍会在报告生成阶段失败。
- 显式指定的配置文件不存在或配置加载失败时，也会失败退出，不会静默跳过测试。
- 测试失败仍生成覆盖率报告，并保留非零退出状态；报告生成失败同样非零退出。
- 支持现有覆盖率配置和 CLI hooks，可按需通过过滤器排除测试文件。
- **`test` 配置在其他 CLI 命令和 API 调用中均不生效**，包括 `merge` 和 `generate()`。

其他 CLI 选项参见[命令行](/zh/reference/cli#command-line)。

## 现代测试工作流 {#modern-testing-workflow}

对于新建的 Node.js 项目，`mcr test` 提供了一种面向未来的轻量化测试方案：基于平台原生能力，一条命令完成测试执行、V8 覆盖率采集和报告生成，减少对独立测试工具链的依赖。

它基于 Node.js 自带的 [`node:test` 测试运行器](https://nodejs.org/docs/latest/api/test.html)，运行器无需额外安装；MCR 仍需按[快速开始](#quick-start)安装。测试断言也可以使用内置的 [`node:assert/strict`](https://nodejs.org/docs/latest/api/assert.html#strict-assertion-mode)。

对于常规 Node.js 单元测试和集成测试，这套方案可以替代 [Mocha](/zh/integrations/frameworks-and-tools#mocha)、[AVA](/zh/integrations/frameworks-and-tools#ava)、[Tape](https://github.com/tape-testing/tape) 等工具承担的测试职责。但它不是这些框架的直接兼容替代：迁移时需要调整测试 API、断言和生命周期钩子，并评估插件、快照等特性需求。
