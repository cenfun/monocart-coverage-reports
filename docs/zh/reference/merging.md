# 合并报告 {#merging-reports}

## 适用场景 {#use-cases}

以下这些使用场景可能需要使用合并覆盖率报告：
- 多个执行环境，比如Node.js服务端，以及浏览器客户端，比如`Next.js`
- 多种测试类型，比如`Jest`单元测试，以及`Playwright`的端到端自动化测试
- 分布式测试，测试结果保存到了多台机器或不同的容器中

## 自动合并 {#automatic-merging}

### 生成报告时合并 {#merge-during-generation}

- 默认`MCR`在执行`generate()`时会自动合并覆盖率数据。所以可以在[多进程支持](/zh/reference/multiprocessing#multiple-processes)下，多次添加覆盖率数据，最后将自动合并
- 比如`Next.js`就可以同时添加前后端覆盖率数据，最后再执行`generate()`生成覆盖率报告，见例子[nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)

### 通过覆盖率服务合并 {#coverage-services}

Codecov 支持在其服务端自动合并。配置 `codecov` 报告生成 `codecov.json`，再上传各次测试产生的文件。参见 [Codecov](/zh/integrations/coverage-services#codecov) 和[合并报告说明](https://docs.codecov.com/docs/merging-reports)。

## 手动合并 {#manual-merging}

需要合并多次测试运行或多台机器的覆盖率时，先让每次测试导出 `raw` 报告。收集所有 raw 数据目录后，通过 `inputDir` 统一加载并生成一份合并报告。

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

将端到端测试覆盖率导出到 `./coverage-reports/e2e/raw`。示例：

- `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter)，使用覆盖率 API
- `Playwright` + `MCR`：[playwright-coverage](https://github.com/cenfun/playwright-coverage)
- 更多[集成示例](/zh/integrations/frameworks-and-tools#frameworks-and-tools)

### 创建合并脚本 {#merge-script}

创建 `merge-coverage.js`，通过 `inputDir` 加载 raw 覆盖率目录，并检查 `generate()` 的返回结果，避免缺少覆盖率数据时 CI 仍误判成功。

```js
// merge-coverage.js
import fs from 'fs';
import { CoverageReport } from 'monocart-coverage-reports';
const inputDir = [
    './coverage-reports/unit/raw',
    './coverage-reports/e2e/raw'
];
const coverageOptions = {
    name: 'My Merged Coverage Report',
    inputDir,
    outputDir: './coverage-reports/merged',

    // filter for both unit and e2e
    entryFilter: {
        '**/node_modules/**': false,
        '**/*': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    },

    sourcePath: (filePath, info) => {
        // Unify the file path for the same files
        // For example, the file index.js has different paths:
        // unit: unit-dist/src/index.js
        // e2e: e2e-dist/src/index.js
        // return filePath.replace("unit-dist/", "").replace("e2e-dist/", "")
        return filePath;
    },

    reports: [
        ['v8'],
        ['console-details']
    ],

    onEnd: () => {
        // remove the raw files if no longer needed
        // inputDir.forEach((p) => {
        //     fs.rmSync(p, {
        //         recursive: true,
        //         force: true
        //     });
        // });
    }
};
const coverageResults = await new CoverageReport(coverageOptions).generate();
if (!coverageResults) {
    throw new Error('No coverage report was generated');
}
```

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
