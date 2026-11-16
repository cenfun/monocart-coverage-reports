# 合并报告 {#merge-coverage-reports}
以下这些使用场景可能需要使用合并覆盖率报告：
- 多个执行环境，比如Node.js服务端，以及浏览器客户端，比如`Next.js`
- 多种测试类型，比如`Jest`单元测试，以及`Playwright`的端到端自动化测试
- 分布式测试，测试结果保存到了多台机器或不同的容器中

## Automatic Merging {#automatic-merging}
- 默认`MCR`在执行`generate()`时会自动合并覆盖率数据。所以可以在[多进程支持](/zh/guide/multiprocessing#multiprocessing-support)下，多次添加覆盖率数据，最后将自动合并
- 比如`Next.js`就可以同时添加前后端覆盖率数据，最后再执行`generate()`生成覆盖率报告，见例子[nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
- 使用`Codecov`在线覆盖率报告服务，请设置输出`codecov`报告, 它会生成专属的`codecov.json`，如果有多个`codecov.json`文件上传，它们会自动合并数据，参见[Codecov](/zh/integrations/examples#codecov) 和 [合并报告说明](https://docs.codecov.com/docs/merging-reports)

## Manual Merging {#manual-merging}
手动合并覆盖率报告需要使用`raw`报告来导出原始的覆盖率数据到指定的目录

**上传 raw/debug 产物前请注意（3.2.0+）：** 即使未配置 hook，`mcr test` 也会在 raw 报告（包括 ZIP）中导出 `test-results-<id>.json`，并在 debug 缓存中保留该文件。测试名称、路径及错误字符串可能包含凭据或个人信息。请先审查产物，并通过 [`onTestEnd`](/zh/reference/hooks#ontestend--仅-mcr-test-可用) 在发布前对正式保存的测试结果脱敏；这不会处理终端输出或已写入的临时文件。导入 raw 数据只合并覆盖率，不会合并测试结果。

- 比如，单元测试保存到`./coverage-reports/unit/raw`，见例子
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

- 同样的，E2E测试保存到`./coverage-reports/e2e/raw`. 见例子:
    - `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter) with coverage API
    - `Playwright` + `MCR`, see [playwright-coverage](https://github.com/cenfun/playwright-coverage)
    - see more [Integration Examples](/zh/integrations/examples#integration-examples)

- 然后创建一个`merge-coverage.js`文件，使用`inputDir`参数导入`raw`数据，来生成合并的覆盖率报告.
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
await new CoverageReport(coverageOptions).generate();
```
- 最后在所有测试完成后运行`node path/to/merge-coverage.js`. 所有的执行脚本大概如下:
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
参见例子： [merge-code-coverage](https://github.com/cenfun/merge-code-coverage)
