# 接入现有测试框架 {#integrate-with-your-framework}

MCR 可以通过 CLI 或 API 与现有测试框架集成，无需替换测试运行器或改变测试编写方式。可根据现有流程选择合适的接入方式。

## CLI {#cli}

对于 Node.js 测试命令，在原有命令前添加 `mcr`，即可采集 V8 覆盖率并生成报告：

```sh
mcr your-cli --your-arguments
```

可用选项参见 [命令行](/zh/reference/cli#command-line)。浏览器测试则需通过框架的覆盖率采集 API 获取数据，再按下述 API 方式交给 MCR。

## API {#api}

在测试 hook 或 fixture 中收集覆盖率数据，然后通过 `await mcr.add(coverageData)` 添加到 MCR 报告实例（[`CoverageReport`](/zh/reference/types#coveragereport)）。所有测试结束后，调用 `await mcr.generate()` 生成报告。

此方式可以自行控制采集和提交覆盖率数据的时机。采集方案及跨进程接入方式参见 [采集 V8 覆盖率](/zh/coverage-collection/v8)、[采集 Istanbul 覆盖率](/zh/coverage-collection/istanbul) 和 [多进程支持](/zh/reference/multiprocessing#multiple-processes)。
