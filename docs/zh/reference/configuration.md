# 配置文件 {#configuration-files}

## 最小配置 {#minimal-config}

在项目根目录创建 `mcr.config.js`，下面使用 ESM 导出语法；CommonJS 配置参见[模块格式](#module-format)：

```js
export default {
    name: 'My Coverage Report',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-summary']
};
```

然后在项目根目录运行（将 `demo.js` 替换为自己的脚本，或使用[快速开始示例](/zh/getting-started/get-started#first-report)）：

```sh
npx mcr node demo.js
```

CLI 会自动查找配置文件。全部可配置字段见[配置选项](/zh/reference/options#configuration-options)，输出格式见[报告](/zh/reference/reports#reports)。

## 模块格式 {#module-format}

MCR 同时支持 ESM 和 CommonJS 配置。ESM 配置使用 `export default`（例如 `package.json` 设置了 `"type": "module"` 的 `.js` 文件）；CommonJS 配置使用 `module.exports`（例如 `.cjs` 文件，或 `"type": "commonjs"` 项目中的 `.js` 文件）。

MCR 的 ESM-only 不会改变项目中 `.js` 文件的模块格式。CommonJS 脚本可以通过 `import()` 异步加载 MCR，无需将整个项目改为 ESM，参见[迁移指南](/zh/migrations/migration-to-3)。

## API 加载配置 {#api}

API 需要在添加数据之前显式加载配置：

```js
import { CoverageReport } from 'monocart-coverage-reports';

const mcr = new CoverageReport();
await mcr.loadConfig();
```

然后按[报告 API 示例](/zh/getting-started/get-started#api)添加数据并生成报告。`MCR({...})` 是 [`new CoverageReport({...})`](/zh/reference/types#coveragereport) 的简写工厂函数。

## 加载行为 {#loading-behavior}

MCR 3.x 中，显式指定的配置不存在，或找到的配置加载失败（包括 JSON 解析、模块语法及初始化错误）时，[`loadConfig()`](/zh/reference/types#coveragereport) 会直接抛出异常，所有 CLI 命令也会非零退出，不再需要 `strict` 参数。未指定自定义配置且找不到默认配置时，仍使用已有选项继续执行。

## 配置类型 {#configuration-types}

配置类型：API 使用 [`CoverageReportOptions`](/zh/reference/types#coveragereportoptions)，CLI 和测试运行器使用 [`McrCliOptions`](/zh/reference/types#mcrclioptions)。

## 加载优先级 {#loading-priority}

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
