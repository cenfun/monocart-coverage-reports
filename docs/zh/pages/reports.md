---
outline: [2, 4]
---

<script setup>
import { withBase } from 'vitepress';
</script>

# 报告 {#reports}

将本页的报告名称填入 [API 的 `reports` 选项](/zh/pages/get-started#api)或[配置文件](/zh/pages/configuration#minimal-config)，CLI 对应参数为 [`-r, --reports`](/zh/pages/options#configuration-options)。各报告支持的输入格式见下面的分类；覆盖率服务的格式选择参见[覆盖率服务](/zh/pages/coverage-services)。

下文中的配置片段只展示报告选项，完整的添加数据和生成流程请复用 [API 示例](/zh/pages/get-started#api)。

## 配置模板 {#configuration-templates}

点击代码块的复制按钮，将模板粘贴到项目根目录的 `mcr.config.mjs`；已有配置时，只合并所需选项。CLI 会自动加载配置；使用 API 时，请[显式加载配置](/zh/pages/configuration#api)，或直接将选项传给 `CoverageReport`。覆盖率仍由现有测试流程采集。

### 本地 V8 报告 {#local-v8-template}

适用于 V8 输入：生成交互式 HTML 报告，并在终端按文件列出覆盖率。

```js
export default {
    outputDir: './coverage-reports/local',
    reports: ['v8', 'console-details']
};
```

### CI 报告与 LCOV {#ci-report-template}

适用于 V8 或 Istanbul 输入。CI 日志保留终端摘要，归档 `./coverage-reports/ci` 可保留 HTML 报告，将 `./coverage-reports/ci/lcov.info` 交给支持 LCOV 的工具。终端摘要不会强制检查[覆盖率阈值](/zh/pages/hooks#coverage-thresholds)。

```js
export default {
    outputDir: './coverage-reports/ci',
    reports: ['console-summary', 'html', 'lcovonly']
};
```

### CI 分片导出 {#ci-shard-template}

此模板适用于 V8 输入：在各自隔离的 CI 作业中只导出原始覆盖率，不在每个分片生成 HTML。若作业共享工作区，请为每个作业使用不同的 `outputDir`。将各作业的 `./coverage-reports/shard/raw`（或自定义 `outputDir` 下的 `raw`）保存为独立且名称唯一的产物。[分享前检查原始产物](./merging#raw-artifact-safety)。下载时分别放入不同目录，确认每个分片都已生成覆盖率后再[统一合并](./merging#manual-merging)。

```js
export default {
    outputDir: './coverage-reports/shard',
    reports: ['raw']
};
```

## 内置报告 {#built-in-reports}

### V8 {#v8-reports}

仅支持 V8 格式数据。

#### `v8` <span role="img" aria-label="推荐优先使用" title="推荐优先使用">⭐</span> {#v8}

生成交互式 HTML 报告，展示 JavaScript 和 CSS 覆盖率以及原生 Bytes 指标。如果构建提供了配套的 source map，报告可将生成代码的覆盖率映射回原始源码。参见 [V8 报告示例](/zh/pages/examples#v8-and-istanbul)。

点击报告顶部的按钮可切换浅色和深色模式。报告默认跟随系统主题，手动选择会保留到系统主题发生变化时。

![V8 报告中的文件树和源码覆盖率](/images/v8.gif)

#### `v8-json` {#v8-json}

- 保存 [`CoverageResults`](/zh/pages/types#coverageresults) 到一个json文件 (默认是 [`coverage-report.json`](/reports/v8-and-istanbul/coverage-report.json))
- `data.extras` 的标记和示例参见[行分类](/zh/pages/coverage-data#line-classifications)。
- 用于VSCode扩展来显示原生V8代码覆盖率: [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)

![](/images/mcv.gif)

### Istanbul {#istanbul-reports}

支持 V8 和 Istanbul 格式数据。

#### `clover` {#clover}

生成 Clover XML 覆盖率报告。

#### `cobertura` {#cobertura}

生成 Cobertura XML 覆盖率报告。

#### `html` {#html}

- 预览：[Istanbul 插桩和 V8 转换生成的报告](/zh/pages/examples#v8-and-istanbul)。

#### `html-spa` {#html-spa}

生成 Istanbul 单页 HTML 覆盖率报告。

#### `json` {#json}

将 Istanbul 覆盖率数据保存为 JSON。

#### `json-summary` {#json-summary}

将覆盖率汇总保存为 JSON。

#### `lcov` {#lcov}

生成 LCOV 覆盖率数据和 HTML 报告。

#### `lcovonly` {#lcovonly}

只生成 LCOV 数据，不生成 HTML。示例：<a :href="withBase('/reports/v8/lcov.info')" target="_blank" rel="noopener noreferrer">V8 的 lcov.info</a>、<a :href="withBase('/reports/istanbul/lcov.info')" target="_blank" rel="noopener noreferrer">Istanbul 的 lcov.info</a>。

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

将总体覆盖率保存为 Markdown 文件（默认文件名为 `coverage-summary.md`）。如需在工作流运行中展示报告，参见 [GitHub Actions 作业摘要](/zh/pages/coverage-services#job-summary)。

![](/images/markdown-summary.png)

#### `markdown-details` {#markdown-details}

保存覆盖率详情到markdown文件 (默认是 `coverage-details.md`)

- 预览运行结果 [runs](https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml)

#### `raw` {#raw}

只是保存原始覆盖率数据, 用于使用`inputDir`参数来导入多个原始数据进行合并报告。参见 [合并覆盖率报告](/zh/pages/merging#merging-reports)

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

`'v8'`（默认值）— 对 V8 输入，先调用 `new Reporter(reportOptions, globalOptions)`，再调用 `await generate(reportData)`。[`reportData`](/zh/pages/types#coverageresults) 是 V8 覆盖率结果，包含 `type`、[`summary`](/zh/pages/types#coveragesummary) 和 [`files`](/zh/pages/types#coveragefile)；每个文件包含 V8 覆盖范围和汇总。

例子: [./test/custom-v8-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-v8-reporter.js)

### `both` — 通用自定义报告 {#custom-both}

`'both'` — 对 V8 或 Istanbul 输入均使用上述 `generate(reportData)` 接口。请检查 `reportData.type`，按对应的结果结构处理。它**不会**同时提供两份原始格式的数据，结果中不存在 `v8Data` 或 `istanbulData` 属性。

### 模块加载 {#module-loading}

报告统一使用原生 ESM `import()` 加载。ESM 报告使用 `export default Reporter`；通过 Node 内置互操作，也可加载 `module.exports = Reporter` 的 CommonJS 报告（在 ESM 项目中使用 `.cjs`）。本地路径必须明确指定文件扩展名，不补全扩展名、不解析目录入口，不提供独立的 CommonJS 加载器。报告加载或初始化失败会使报告生成失败，不会静默跳过。

## 多种报告 {#multiple-reports}

此示例用于说明如何混合内置报告和自定义报告。使用前请替换自定义报告的包名和路径。

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

前往[报告示例](/zh/pages/examples)页面，浏览生成的 V8、Istanbul、浏览器、Node.js 和 CSS 覆盖率报告。
