# 最佳实践 {#best-practices}

为新项目建立测试方案时，优先使用无需插桩的原生覆盖率采集：

## Node.js 端 {#nodejs}

推荐方案：**Node.js 原生 test runner + `mcr test`**。

`node:test` 执行测试断言；MCR 自动采集 JavaScript 原生 V8 覆盖率并生成报告。

更多详情参见[使用 mcr test 运行测试](/zh/getting-started/node-test-runner#run-tests-with-mcr-test)。

## 浏览器端 {#browser}

推荐方案：**Playwright Test + MCR**。

Playwright 执行测试断言；自动 fixture 采集 Chromium JS/CSS 覆盖率；MCR 合并并生成报告。

采集方式参见 [Playwright 覆盖率采集](/zh/coverage-collection/v8#playwright)，自动采集示例参见 [fixtures.js](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.js)。

## 统一测试报告 {#integrated-reporting}

浏览器测试需要统一管理测试报告和覆盖率报告时，推荐使用 **Playwright Test + monocart-reporter**。

reporter 已集成 MCR；配置其 coverage 选项，并由 fixture 提交覆盖率数据即可。

配置方法参见 [monocart-reporter 覆盖率报告指南](https://github.com/cenfun/monocart-reporter#code-coverage-report)。

## 延伸阅读 {#further-reading}

详细配置步骤和示例见[最佳实践指南](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/references/best-practices.md)。
