# 配置文件 {#configuration-files}
MCR 3.x 中，显式指定的配置不存在，或找到的配置加载失败（包括 JSON 解析、模块语法及初始化错误）时，[`loadConfig()`](/zh/reference/types#coveragereport) 会直接抛出异常，所有 CLI 命令也会非零退出，不再需要 `strict` 参数。未指定自定义配置且找不到默认配置时，仍使用已有选项继续执行。

配置类型：API 使用 [`CoverageReportOptions`](/zh/reference/types#coveragereportoptions)，CLI 和测试运行器使用 [`McrCliOptions`](/zh/reference/types#mcrclioptions)。

根据以下优先级加载配置文件
- 自定义配置文件（如果没有指定则加载后面的默认配置文件）:
    - CLI: `mcr --config <my-config-file-path>`
    - API: `await mcr.loadConfig("my-config-file-path")`
- `mcr.config.js`
- `mcr.config.cjs`
- `mcr.config.mjs`
- `mcr.config.json` - json format
- `mcr.config.ts` （需要预加载 TypeScript 执行模块，比如 `tsx`）:
```sh
mcr --import tsx -c mcr.config.ts node ./test.js
```

> 未指定自定义路径时，MCR 会从当前工作目录向上查找默认配置文件（通过 [`find-up`](https://github.com/sindresorhus/find-up)）。不在搜索路径内的文件会被忽略
