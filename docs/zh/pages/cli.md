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

```sh
mcr node demo.js
```

请分开传入可执行文件和参数：`node` 是可执行文件，`demo.js` 是它的参数。MCR 不主动开启 shell 模式，并在命令退出后生成覆盖率报告。可用 [`--`](#separate-child-arguments) 隔离子程序选项与 MCR 选项。

## CLI 选项 {#cli-options}

下表列出 `mcr` 自身接受的命令行参数，默认值可由配置文件覆盖。

| 参数 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `-v, --version` | — | 显示当前版本并退出。 |
| `-c, --config <path>` | — | 指定配置文件路径；参见 [配置文件](/zh/pages/configuration#configuration-files)。 |
| `-l, --logging <level>` | `info` | 设置 [日志级别](/zh/pages/options#logging)：`off`、`error`、`info` 或 `debug`。 |
| `-n, --name <name>` | `Coverage Report` | 设置 [报告标题](/zh/pages/options#name)。 |
| `-r, --reports <name[,name]>` | 自动 | 指定要生成的 [报告](/zh/pages/options#reports)，多个名称用逗号分隔。 |
| `-o, --outputDir <dir>` | `./coverage-reports` | 设置 [报告输出目录](/zh/pages/options#outputdir)。 |
| `-i, --inputDir <dir[,dir]>` | — | 指定用于合并的 [原始覆盖率输入](/zh/pages/options#inputdir)，多个路径用逗号分隔。 |
| `-b, --baseDir <dir>` | `process.cwd()` | 设置规范化源码路径所用的 [基准目录](/zh/pages/options#basedir)。 |
| `-a, --all <dir[,dir]>` | — | 纳入一个或多个目录中的 [未测试文件](/zh/pages/options#all)，多个目录用逗号分隔。 |
| `--entryFilter <pattern>` | — | 按模式筛选 [V8 条目 URL](/zh/pages/options#entryfilter)。 |
| `--sourceFilter <pattern>` | — | 按模式筛选 [sourcemap 中的源码](/zh/pages/options#sourcefilter)。 |
| `--outputFilter <pattern>` | — | 按模式筛选 [最终源码路径](/zh/pages/options#outputfilter)。 |
| `--filter <pattern>` | — | 为条目和源码筛选设置 [备用模式](/zh/pages/options#filter)。各自的筛选选项如已设置，则优先使用。 |
| `--outputFile <path>` | `index.html` | 设置相对于输出目录的 [V8 HTML 报告路径](/zh/pages/options#outputfile)。 |
| `--inline` | `false` | 将资源 [内联](/zh/pages/options#inline) 到 V8 HTML 报告中。 |
| `--assetsPath <path>` | `./assets` | 未内联资源时，设置 [V8 报告资源路径](/zh/pages/options#assetspath)。 |
| `--lcov` | `false` | 同时生成 [`lcov.info`](/zh/pages/options#lcov)。 |
| `--import <module>` | — | 通过 `NODE_OPTIONS` [预加载 ESM 模块](#preload-modules)，例如 `tsx`。 |
| `--require <module>` | — | `--import` 的已弃用别名；使用 ESM 解析。 |
| `--env [path]` | — | 从 dotenv 文件 [加载环境变量](#environment-variables)。传入此参数但未指定路径时使用 `.env`。 |
| `-h, --help` | — | 显示 CLI 帮助并退出。 |

`--import`、`--require` 和 `--env` 适用于启动子进程的命令（包括 `mcr test`）。`mcr merge` 会忽略这些参数。

仅通过配置文件设置的选项（包括 `test` 和 hooks），参见 [配置选项](/zh/pages/options#configuration-options)。

### 隔离子程序参数 {#separate-child-arguments}

使用 `--` 可以隔离子程序参数，以免两种参数混淆：
```sh
mcr -c mcr.config.js -- sub-cli -c sub-cli.config.js
```

### 预加载模块 {#preload-modules}

`--import <module>` / `--require <module>`: 通过 `NODE_OPTIONS` 把一个预加载模块传给子进程。用于预加载 `tsx` 等运行时，也适用于配置文件中超出原生擦除能力的语法。使用 `ts-node` 运行 ESM 的方法参见[外部加载器](/zh/pages/typescript#ts-node)。仅使用可擦除类型语法的 `mcr.config.ts` 不需要 loader。在所有受支持的 Node.js 版本中均可用。本地路径以当前工作目录为基准，必须明确指定文件扩展名，支持包含空格的路径。包名由原生 ESM 按 MCR 模块位置解析。两个选项都使用 `import()`，并向 Node 传递 `--import`；`--require` 仅为已弃用别名，不提供 CommonJS 加载逻辑。CJS 模块仅通过 Node 内置的 import 互操作支持。
```sh
mcr --import tsx node ./test.ts
```

### 环境变量 {#environment-variables}

`--env [path]`: 子进程启动前从 dotenv 文件加载环境变量（默认 `.env`）。使用 `process.loadEnvFile`，在所有受支持的 Node.js 版本中均可用
```sh
mcr --env .env.test node ./test.js
```

## 内置命令 {#built-in-commands}

| 命令 | 说明 |
| :-- | :-- |
| [`mcr merge`](#merge-coverage) | 合并原始覆盖率数据并生成报告，无需启动子进程。 |
| [`mcr test`](#run-tests) | 运行 Node.js 测试并生成覆盖率报告。 |

### `mcr merge` {#merge-coverage}

合并 `--inputDir` 指定的原始覆盖率数据并生成报告，无需启动子进程。

```sh
mcr merge -r v8,console-details --inputDir ./coverage-reports/unit/raw,./coverage-reports/e2e/raw --outputDir ./coverage-reports/merged
```
参见 [合并覆盖率报告](/zh/pages/merging#merging-reports)。

### `mcr test` {#run-tests}

运行 Node.js 测试并生成覆盖率报告。

```sh
mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
```

更多用法参见 [使用 `mcr test` 运行测试](/zh/pages/node-test-runner#run-tests-with-mcr-test)。

## 示例 {#examples}

- [使用 `mcr test` 运行 Node.js 测试](/zh/pages/node-test-runner#run-tests-with-mcr-test)
- [TypeScript 支持](/zh/pages/typescript#typescript-support)
- [使用配置文件运行 `mcr`](/zh/pages/configuration#minimal-config)
