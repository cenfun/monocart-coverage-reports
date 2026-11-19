# 命令行 {#command-line}

> 使用`mcr`命令行将使用`NODE_V8_COVERAGE=dir`来启动一个[子进程](https://nodejs.org/docs/latest/api/child_process.html)运行程序，直到正常退出，然后自动从`dir`目录来读取覆盖率数据，并生成覆盖率报告

## 安装 {#installation}

### 全局安装 {#global-installation}

```sh
npm i monocart-coverage-reports -g
mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

### 本地安装 {#local-installation}

```sh
npm i monocart-coverage-reports
npx mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

## 命令执行 {#command-execution}

命令使用 Execa 的默认选项执行，不主动开启 shell 模式。请分别传入可执行文件及参数，例如 `mcr node "./my app.js"`，不要把整条命令作为一个带引号的参数传入。MCR 保留参数边界，不展开环境变量或 glob，也不解析管道、重定向、`&&` 等 shell 语法；组合命令请放入脚本。使用 `mcr [options] -- executable ...args` 可以避免子命令参数被当作 MCR 参数解析。平台相关的命令执行由 Execa 处理，包括在 Windows 下按需通过 `cmd.exe` 调用批处理文件并转义参数。

## CLI 选项 {#cli-options}

以下选项仅在 CLI 模式（`mcr <command>`）下可用：

| 选项 | 类型 | 默认值 | 说明 |
| :-- | :-- | :-- | :-- |
| `-c, --config` | `string` | — | 自定义配置文件路径 |
| `--import` | `string` | `null` | 通过 `NODE_OPTIONS` 预加载 ESM 模块，如 `tsx`。|
| `--require` | `string` | `null` | `--import` 的已弃用别名；使用 ESM 加载，不使用 CommonJS 解析 |
| `--env` | `string` | `null` | 从 dotenv 文件加载环境变量（默认 `.env`）。|
| `test`（仅配置文件） | `string \| string[] \| null` | `null` | 未指定命令行目标时，原样传给 `node --test` 的默认测试文件路径或 glob，**仅 `mcr test` 使用**；其他命令和 API 忽略。需要 Node.js `>= 22.18.0` |
| `onTestEnd`（仅配置文件） | `(testResults) => void \| Promise<void>` | `null` | 仅 `mcr test`：测试结果采集完成后、`onReady` 和覆盖率生成前触发；参见 [Hooks](/zh/reference/hooks#hooks) |
| `onStart` | `(coverageReport) => Promise<void>` | `null` | 子进程启动前触发；参见 [Hooks](/zh/reference/hooks#hooks) |
| `onReady` | `(coverageReport, nodeV8CoverageDir, subprocess) => Promise<void>` | `null` | 子进程退出后、MCR 读取覆盖率前触发；参见 [Hooks](/zh/reference/hooks#hooks) |

其他选项（如 `--name`、`--reports`、`--outputDir`、`--lcov` 等）参见 [配置选项](/zh/reference/options#configuration-options)，它们在 CLI 中的用法相同。

## TypeScript 分析 {#typescript-analysis}

`--typescript` 强制分析符合条件的原始 TS；`--no-typescript` 关闭 MCR 的 TS 分析，即使已确认原生 TS 身份。两者都会覆盖配置文件；都不传时保留配置，默认自动识别。这些参数影响报告分析，不改变 Node 执行模式。对象和文件回调应写在配置文件或 API options 中。参见 [TypeScript 支持](/zh/reference/typescript#analysis-policy)。

```sh
mcr --typescript node ./src/example.ts
mcr --no-typescript merge --inputDir ./raw
```

## 隔离子程序参数 {#separate-child-arguments}

使用 `--` 可以隔离子程序参数，以免两种参数混淆：
```sh
mcr -c mcr.config.js -- sub-cli -c sub-cli.config.js
```

## 预加载模块 {#preload-modules}

`--import <module>` / `--require <module>`: 通过 `NODE_OPTIONS` 把一个预加载模块传给子进程。用于项目需要的 TypeScript/JSX 运行时（`tsx`、`ts-node` 等）。在较新 Node.js 上，原生可擦除 TS 程序及 `mcr.config.ts` 无需预加载模块，参见 [TypeScript 支持](/zh/reference/typescript#typescript-support)。在所有受支持的 Node.js 版本中均可用。本地路径以当前工作目录为基准，必须明确指定文件扩展名，支持包含空格的路径。包名由原生 ESM 按 MCR 模块位置解析。两个选项都使用 `import()`，并向 Node 传递 `--import`；`--require` 仅为已弃用别名，不提供 CommonJS 加载逻辑。CJS 模块仅通过 Node 内置的 import 互操作支持。
```sh
mcr --import tsx node ./test.ts
```

## 环境变量 {#environment-variables}

`--env [path]`: 子进程启动前从 dotenv 文件加载环境变量（默认 `.env`）。使用 `process.loadEnvFile`，在所有受支持的 Node.js 版本中均可用
```sh
mcr --env .env.test node ./test.js
```

## 运行测试 {#run-tests}

`test`：运行 Node.js 测试并生成覆盖率报告，参见[使用 `mcr test` 运行测试](/zh/getting-started/node-test-runner#run-tests-with-mcr-test)。

## 合并覆盖率 {#merge-coverage}

`merge`: 直接合并 `inputDir` 中的原始覆盖率数据并生成合并报告，无需启动子进程。
```sh
mcr merge -r v8,console-details --inputDir ./coverage-reports/unit/raw,./coverage-reports/e2e/raw --outputDir ./coverage-reports/merged
```
参见 [合并覆盖率报告](/zh/reference/merging#merging-reports)。

## 示例 {#examples}

- [Mocha](/zh/integrations/frameworks-and-tools#mocha)
- [TypeScript](/zh/integrations/frameworks-and-tools#typescript)
- [AVA](/zh/integrations/frameworks-and-tools#ava)
