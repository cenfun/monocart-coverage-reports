# 接入任意测试框架 {#integration-with-any-testing-framework}
通用集成方案
- 通过API接口在程序集成
    - 首先，要自行收集覆盖率数据，然后，添加到报告实例 `await mcr.add(coverageData)`
    - 最后，生成覆盖率报告 `await mcr.generate()`
    - 参见 [多进程支持](/zh/guide/multiprocessing#multiprocessing-support)
- 通过CLI命令行与其他命令行集成
    - 直接在其他命令行前面添加mcr的命令行即可 `mcr your-cli --your-arguments`
    - 参见 [命令行](/zh/reference/cli#command-line)
