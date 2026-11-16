# 最佳实践 {#best-practices}

为新项目建立测试方案时，优先使用无需插桩的原生覆盖率采集：

| 测试目标 | 推荐方案 | 职责划分 |
| --- | --- | --- |
| Node.js 端 | **Node.js 原生 test runner + `mcr test`** | `node:test` 执行测试断言；MCR 自动采集 JavaScript 原生 V8 覆盖率并生成报告。 |
| 浏览器端 | **Playwright Test + MCR** | Playwright 执行测试断言；自动 fixture 采集 Chromium JS/CSS 覆盖率；MCR 合并并生成报告。 |
| 浏览器端，需要统一测试报告 | **Playwright Test + [monocart-reporter](https://github.com/cenfun/monocart-reporter#code-coverage-report)** | reporter 已集成 MCR；配置其 coverage 选项，并由 fixture 提交覆盖率数据，统一管理测试报告和覆盖率报告。 |

详细配置步骤和示例见[最佳实践指南](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/references/best-practices.md)。
