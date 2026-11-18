---
outline: [2, 4]
---

# 报告 {#reports}

将本页的报告名称填入 [API 的 `reports` 选项](/zh/getting-started/get-started#api)或[配置文件](/zh/reference/configuration#minimal-config)，CLI 对应参数为 [`-r, --reports`](/zh/reference/options#configuration-options)。各报告支持的输入格式见下面的分类；覆盖率服务的格式选择参见[覆盖率服务](/zh/integrations/coverage-services)。

下文中的配置片段只展示报告选项，完整的添加数据和生成流程请复用 [API 示例](/zh/getting-started/get-started#api)。

## 内置报告 {#built-in-reports}

### V8 {#v8-reports}

仅支持 V8 格式数据。

#### `v8` <span role="img" aria-label="推荐优先使用" title="推荐优先使用">⭐</span> {#v8}

- 推荐使用:
    - 全新的原生V8覆盖率报告界面，更好的用户体验
    - 支持原生的Bytes覆盖率指标
    - 支持高性能处理大数据
    - 支持任何运行时代码的覆盖率（压缩后的）
    - 支持CSS代码覆盖率（用于分析CSS的冗余代码）
    - 对Sourcemap转换有更好的支持
- 预览: [V8](https://cenfun.github.io/monocart-coverage-reports/reports/v8) and [更多](/zh/getting-started/examples)

![](/images/v8.gif)

#### `v8-json` {#v8-json}

- 保存 [`CoverageResults`](/zh/reference/types#coverageresults) 到一个json文件 (默认是 [`coverage-report.json`](https://cenfun.github.io/monocart-coverage-reports/reports/v8-and-istanbul/coverage-report.json))
- 用于VSCode扩展来显示原生V8代码覆盖率: [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)

![](/images/mcv.gif)

### Istanbul {#istanbul-reports}

支持 V8 和 Istanbul 格式数据。

#### `clover` {#clover}

生成 Clover XML 覆盖率报告。

#### `cobertura` {#cobertura}

生成 Cobertura XML 覆盖率报告。

#### `html` {#html}

- [Istanbul html](https://cenfun.github.io/monocart-coverage-reports/reports/istanbul/)
- [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/reports/v8-and-istanbul/istanbul)

#### `html-spa` {#html-spa}

生成 Istanbul 单页 HTML 覆盖率报告。

#### `json` {#json}

将 Istanbul 覆盖率数据保存为 JSON。

#### `json-summary` {#json-summary}

将覆盖率汇总保存为 JSON。

#### `lcov` {#lcov}

生成 LCOV 覆盖率数据和 HTML 报告。

#### `lcovonly` {#lcovonly}

- [V8 lcov.info](https://cenfun.github.io/monocart-coverage-reports/reports/v8/lcov.info)
- [Istanbul lcov.info](https://cenfun.github.io/monocart-coverage-reports/reports/istanbul/lcov.info)

#### `none` {#none}

不输出 Istanbul 报告。

#### `teamcity` {#teamcity}

以 TeamCity 服务消息的形式输出覆盖率统计。

#### `text` {#text}

在控制台显示各文件的覆盖率详情。

#### `text-lcov` {#text-lcov}

在控制台输出 LCOV 覆盖率数据。

#### `text-summary` {#text-summary}

在控制台显示覆盖率汇总。

### 通用报告 {#shared-reports}

以下内置报告同时支持 V8 和 Istanbul 格式数据。

#### `codecov` {#codecov}

保存覆盖率数据到 [Codecov](https://docs.codecov.com/docs/codecov-custom-coverage-format) 专属的json文件 (默认是`codecov.json`), 见[例子](https://app.codecov.io/github/cenfun/monocart-coverage-reports)

#### `codacy` {#codacy}

保存覆盖率数据到 [Codacy](https://api.codacy.com/swagger#tocscoveragereport) 专属的json文件 (默认是`codacy.json`)

#### `console-summary` <span role="img" aria-label="推荐优先使用" title="推荐优先使用">⭐</span> {#console-summary}

在控制台显示覆盖率概要

![](/images/console-summary.png)

#### `console-details` <span role="img" aria-label="推荐优先使用" title="推荐优先使用">⭐</span> {#console-details}

在控制台显示每个文件的覆盖率概要。如果是Github actions，可以使用环境变量`FORCE_COLOR: true`来强制开启颜色支持

![](/images/console-details.png)

#### `markdown-summary` {#markdown-summary}

保存概要信息到markdown文件 (默认是`coverage-summary.md`)。 如果是Github actions, 可以把markdown的内容添加到[a job summary](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)

```sh
cat path-to/coverage-summary.md >> $GITHUB_STEP_SUMMARY
```
![](/images/markdown-summary.png)

#### `markdown-details` {#markdown-details}

保存覆盖率详情到markdown文件 (默认是 `coverage-details.md`)

- 预览运行结果 [runs](https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml)

#### `raw` {#raw}

只是保存原始覆盖率数据, 用于使用`inputDir`参数来导入多个原始数据进行合并报告。参见 [合并覆盖率报告](/zh/reference/merging#merging-reports)

## 自定义报告 {#custom-reports}

通过报告模块路径或 npm 包名配置自定义报告，使用 `type` 指定报告接口。

```js
import path from 'node:path';

const coverageOptions = {
    reports: [
        [path.resolve('./test/custom-istanbul-reporter.js'), {
            type: 'istanbul',
            file: 'custom-istanbul-coverage.text'
        }],
        [path.resolve('./test/custom-v8-reporter.js'), {
            type: 'v8',
            outputFile: 'custom-v8-coverage.json'
        }],
        [path.resolve('./test/custom-v8-reporter.mjs'), {
            type: 'both'
        }]
    ]
};
```

### `istanbul` — Istanbul 自定义报告 {#custom-istanbul}

`'istanbul'` — 使用 Istanbul 报告接口：先调用 `new Reporter(reportOptions)`，再调用 `execute(context)`。context 提供 Istanbul 报告树和源码查找能力。V8 输入会先转换为 Istanbul 覆盖率数据。

例子: [./test/custom-istanbul-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-istanbul-reporter.js), see [istanbul built-in reporters' implementation](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) for reference.

### `v8` — V8 自定义报告 {#custom-v8}

`'v8'`（默认值）— 对 V8 输入，先调用 `new Reporter(reportOptions, globalOptions)`，再调用 `await generate(reportData)`。[`reportData`](/zh/reference/types#coverageresults) 是 V8 覆盖率结果，包含 `type`、[`summary`](/zh/reference/types#coveragesummary) 和 [`files`](/zh/reference/types#coveragefile)；每个文件包含 V8 覆盖范围和汇总。

例子: [./test/custom-v8-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-v8-reporter.js)

### `both` — 通用自定义报告 {#custom-both}

`'both'` — 对 V8 或 Istanbul 输入均使用上述 `generate(reportData)` 接口。请检查 `reportData.type`，按对应的结果结构处理。它**不会**同时提供两份原始格式的数据，结果中不存在 `v8Data` 或 `istanbulData` 属性。

### 模块加载 {#module-loading}

报告统一使用原生 ESM `import()` 加载。ESM 报告使用 `export default Reporter`；通过 Node 内置互操作，也可加载 `module.exports = Reporter` 的 CommonJS 报告（在 ESM 项目中使用 `.cjs`）。本地路径必须明确指定文件扩展名，不补全扩展名、不解析目录入口，不提供独立的 CommonJS 加载器。报告加载或初始化失败会使报告生成失败，不会静默跳过。

## Multiple Reports {#multiple-reports}
如何配置多个报告
```js
import { MCR } from 'monocart-coverage-reports';
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        // built-in reports
        ['console-summary'],
        ['v8'],
        ['html', {
            subdir: 'istanbul'
        }],
        ['json', {
            file: 'my-json-file.json'
        }],
        'lcovonly',

        // custom reports
        // Specify reporter name with the NPM package
        ['custom-reporter-1'],
        ['custom-reporter-2', {
            type: 'istanbul',
            key: 'value'
        }],
        // Specify reporter name with local path
        ['/absolute/path/to/custom-reporter.js']
    ]
};
const mcr = MCR(coverageOptions);
```

## 报告示例 {#report-examples}

前往[报告示例](/zh/getting-started/examples)页面，浏览生成的 V8、Istanbul、浏览器、Node.js 和 CSS 覆盖率报告。
