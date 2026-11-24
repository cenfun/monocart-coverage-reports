# 合并报告 {#merging-reports}

## 适用场景 {#use-cases}

当单次运行或单个环境的覆盖率数据不足以反映整体情况时，可以合并报告：

- **服务端与客户端：** 以 Next.js 应用为例，Node.js 服务端和浏览器客户端可能分别产生覆盖率数据。合并后可以在同一份报告中查看两端的代码覆盖情况。参见 [Next.js 与 Playwright 示例](#merge-during-generation)。
- **单元测试与端到端测试：** Jest 单元测试和 Playwright 端到端测试可能覆盖同一应用的不同部分。合并后可以看到两套测试一共覆盖了哪些代码。参见[手动合并示例](#manual-merging)。
- **CI 分片：** 每个分片只运行部分测试。合并所有分片的覆盖率，才能看到整套测试覆盖了哪些代码。

根据数据的采集方式选择合并方法：

- **同一报告实例或共享缓存：** 等所有采集完成后调用一次 [`generate()`](#merge-during-generation)。
- **独立运行或不同机器：** 每次运行各自导出 [`raw` 报告，然后统一导入](#manual-merging)。
- **只需在覆盖率服务上查看总览：** 如果服务支持，可[分别上传并在服务端合并](#coverage-services)。

MCR 本地合并时，各次运行应使用同一种采集格式（V8 或 Istanbul）。路径规范化和 `sourcePath` 选项参见[源码路径](/zh/reference/source-path)。

## 自动合并 {#automatic-merging}

### 生成报告时合并 {#merge-during-generation}

- 默认`MCR`在执行`generate()`时会自动合并覆盖率数据。所以可以在[多进程支持](/zh/reference/multiprocessing#multiple-processes)下，多次添加覆盖率数据，最后将自动合并
- 比如`Next.js`就可以同时添加前后端覆盖率数据，最后再执行`generate()`生成覆盖率报告，见例子[nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)

### 通过覆盖率服务合并 {#coverage-services}

Codecov 支持在其服务端自动合并。配置 `codecov` 报告生成 `codecov.json`，再上传各次测试产生的文件。参见 [Codecov](/zh/integrations/coverage-services#codecov) 和[合并报告说明](https://docs.codecov.com/docs/merging-reports)。

## 手动合并 {#manual-merging}

需要合并多次测试运行或多台机器的覆盖率时，先让每次测试导出 `raw` 报告。收集所有 raw 数据目录后，通过 `inputDir` 统一加载并生成一份合并报告。以下示例假定两套测试都采集 V8 覆盖率。

### 分享前审查 raw 产物 {#raw-artifact-safety}

**上传 raw/debug 产物前请注意（3.2.0+）：** 即使未配置 hook，`mcr test` 也会在 raw 报告（包括 ZIP）中导出 `test-results-<id>.json`，并在 debug 缓存中保留该文件。测试名称、路径及错误字符串可能包含凭据或个人信息。请先审查产物，并通过 [`onTestEnd`](/zh/reference/hooks#ontestend) 在发布前对正式保存的测试结果脱敏；这不会处理终端输出或已写入的临时文件。导入 raw 数据只合并覆盖率，不会合并测试结果。

### 导出单元测试覆盖率 {#unit-test-coverage}

将单元测试覆盖率导出到 `./coverage-reports/unit/raw`。示例：

- `Jest` + [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage)
- `Vitest` + [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage)

```js
const coverageOptions = {
    name: 'My Unit Test Coverage Report',
    outputDir: './coverage-reports/unit',
    reports: [
        ['raw', {
            // relative path will be "./coverage-reports/unit/raw"
            // defaults to raw
            outputDir: 'raw'
        }],
        ['v8'],
        ['console-details']
    ]
};
```

### 导出端到端测试覆盖率 {#e2e-coverage}

在 Playwright 测试中沿用[上面的 `raw` 报告配置](#unit-test-coverage)，将顶层 `outputDir` 改为 `./coverage-reports/e2e`，并保留 `raw` 报告的 `outputDir` 为 `raw`，即可将覆盖率导出到 `./coverage-reports/e2e/raw`。示例：

- `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter)，使用覆盖率 API
- `Playwright` + `MCR`：[playwright-coverage](https://github.com/cenfun/playwright-coverage)
- 更多[集成示例](/zh/integrations/frameworks-and-tools#frameworks-and-tools)

### 创建合并脚本 {#merge-script}

创建 `merge-coverage.js`，在 `inputDir` 中列出两个 raw 覆盖率目录。

```js
// merge-coverage.js
import { CoverageReport } from 'monocart-coverage-reports';

const coverageResults = await new CoverageReport({
    inputDir: [
        './coverage-reports/unit/raw',
        './coverage-reports/e2e/raw'
    ],
    outputDir: './coverage-reports/merged',
    reports: ['v8', 'console-details']
}).generate();

if (!coverageResults) {
    throw new Error('No coverage report was generated');
}
```

在 CI 中，合并前请确认两次测试都已生成 raw 覆盖率数据。MCR 会跳过不存在的输入目录，因此即使缺少一份数据，也可能生成报告。

### 所有测试完成后执行合并 {#run-merge}

等待所有测试完成并收集好 raw 数据后，再运行 `node path/to/merge-coverage.js`。例如：

```json
{
    "scripts": {
        "test:unit": "jest",
        "test:e2e": "playwright test",
        "merge-coverage": "node path/to/merge-coverage.js",
        "test": "npm run test:unit && npm run test:e2e && npm run merge-coverage"
    }
}
```
完整示例参见 [merge-code-coverage](https://github.com/cenfun/merge-code-coverage)。
