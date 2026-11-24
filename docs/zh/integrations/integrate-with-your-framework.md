# 接入现有测试框架 {#integrate-with-your-framework}

无需替换现有测试运行器。Node.js 命令可通过 CLI 采集；浏览器测试或已采集数据的运行器可通过 API 导入。对于已经使用 `node:test` 的项目，可直接用 [`mcr test`](/zh/getting-started/node-test-runner#quick-start)。先查找[适用于你的框架的集成](/zh/integrations/frameworks-and-tools)，没有现成方案时再按下面的方法接入。

## CLI {#cli}

对于 Node.js 测试命令，在原有命令前添加 `mcr`，即可采集 V8 覆盖率并生成报告：

```sh
npx mcr -- your-test-runner --your-arguments
```

可用选项参见 [命令行](/zh/reference/cli#command-line)。浏览器测试则需通过框架的覆盖率采集 API 获取数据，再按下述 API 方式交给 MCR。

## API {#api}

在测试 hook 或 fixture 中收集覆盖率数据，然后通过 `await mcr.add(coverageData)` 添加到 MCR 报告实例（[`CoverageReport`](/zh/reference/types#coveragereport)）。所有测试结束后，调用 `await mcr.generate()` 生成报告。

此方式可以自行控制采集和提交覆盖率数据的时机。采集方案及跨进程接入方式参见 [采集 V8 覆盖率](/zh/coverage-collection/v8)、[采集 Istanbul 覆盖率](/zh/coverage-collection/istanbul) 和 [多进程支持](/zh/reference/multiprocessing#multiple-processes)。
