# 从 MCR 2.x 迁移到 3.x {#migrating-from-mcr-2-x-to-3-x}

<span id="从-mcr-2-x-迁移到-3-x"></span>

MCR 3.x 保留核心覆盖率 API 和报告配置，但改变了 Node.js 版本要求、模块加载、CLI 执行和错误处理。已使用 ESM 且 Node.js 版本满足要求的项目通常只需少量调整；CommonJS 项目和依赖 shell 解析的命令需要重点检查。

## 1. 升级 Node.js {#_1-upgrade-node-js-first}

所有 MCR API 和 CLI 命令（包括 `merge` 和 `test`）都需要 **Node.js >= 22.18.0**。检查本地开发环境、CI、容器镜像，以及通过 `NODE_OPTIONS` 继承 MCR 预加载模块的子进程。

暂时无法升级时，请固定已经验证兼容的 2.x 版本及其依赖锁文件。并非所有 2.x 依赖组合都支持旧版 Node.js。

## 2. 更新 CommonJS 导入 {#_2-replace-the-commonjs-entry}

MCR 只提供 ESM 入口，不再支持直接调用旧式 `require('monocart-coverage-reports')` 的返回值。在 ESM 中使用默认导入或命名导入：

```js
import MCR from 'monocart-coverage-reports';
// Alternatively: import { MCR, CoverageReport } from 'monocart-coverage-reports';

const report = MCR({
    outputDir: './coverage-reports'
});
```

默认导出的 `MCR` 函数仍有 `MCR.CoverageReport`、`MCR.CDPClient` 和 `MCR.Util` 等属性。**无需把整个项目转成 ESM**；CommonJS 脚本可在异步函数中使用 `import()`：

```js
// coverage.cjs
async function main() {
    const { MCR } = await import('monocart-coverage-reports');
    const report = MCR({
        outputDir: './coverage-reports'
    });
    await report.addFromDir('./coverage-data');
    if (!await report.generate()) {
        throw new Error('No coverage report was generated');
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

如果上层封装之前同步加载 MCR，现在可能也需要将初始化改为异步。CLI 预加载优先使用 [`--import`](/zh/pages/cli#preload-modules)；旧的 `--require` 只是兼容别名，不使用 CommonJS 解析规则。本地预加载路径需要扩展名，包名从 MCR 的模块位置解析。只提供 `require` 导出条件的包需提供可由 `import()` 加载的入口，或改用显式文件路径。

### TypeScript 和子路径入口 {#typescript-and-secondary-entry-points}

将 `import MCR = require('monocart-coverage-reports')` 改为 ESM 导入，并检查 TypeScript 的模块设置和编译输出，避免重新生成旧式的 `require()` 调用。`/util` 和 `/converter` 只提供命名导出：

```ts
import { Util } from 'monocart-coverage-reports/util';
import { convertV8List } from 'monocart-coverage-reports/converter';
import type { CoverageReportOptions } from 'monocart-coverage-reports';
```

## 3. 检查配置文件 {#_3-check-configuration-files}

[配置文件](/zh/pages/configuration)仍同时支持 ESM 和 CommonJS。`mcr.config.mjs` 使用 `export default`，`mcr.config.cjs` 使用 `module.exports`。MCR 改用 ESM 不会改变项目中 `.js` 文件的模块格式。如果你为项目添加了 `"type": "module"`，请将原来使用 `module.exports` 的 `.js` 配置改写为 ESM，或重命名为 `.cjs`，并更新显式的 `--config` 路径。

显式指定的配置不存在，或自动找到的配置加载失败（包括语法、JSON 解析及初始化错误）时，`loadConfig()` 会抛出异常，CLI 也会以非零状态退出。API 调用方应 `await loadConfig()` 并处理失败。未指定配置且找不到默认配置时，仍使用已有选项继续运行。

## 4. 分开传递 CLI 命令和参数 {#_4-pass-cli-commands-as-executable-and-arguments}

MCR 不再把参数拼成一条 shell 命令，而是将可执行文件和参数分别传给 Execa。例如：

```sh
# Before
mcr "node ./app.js"

# After
mcr node ./app.js
mcr node "./my app.js"

# Separate child arguments from MCR options
mcr -c mcr.config.cjs -- node ./app.js
```

MCR 不展开环境变量或通配符，也不解析管道、重定向或 `&&`。复合命令可放进 npm 脚本，再用 `mcr npm run coverage-target` 执行。终端使用的外层 shell 仍可能在 MCR 收到参数前进行展开或重定向；参见[命令执行](/zh/pages/cli#command-execution)。

同时检查 CI 退出状态：即使 hook 将 `process.exitCode` 重置为 `0`，失败的子命令仍会保留失败状态；报告生成失败也会非零退出。

## 5. 检查 HTTP 和 CDP 超时 {#_5-review-slow-http-and-cdp-requests}

| 设置 | 默认值 | 作用范围 |
| --- | --- | --- |
| `Util.request(url, { timeout })` | 30000 ms | HTTP 请求总时限，包括响应头和响应体。远程 sourcemap 加载也受默认 HTTP 时限影响。 |
| `CDPClient({ timeout })` | 10000 ms | HTTP 调试目标发现及 WebSocket 连接建立。 |
| `CDPClient({ requestTimeout })` | 30000 ms | 内置 WebSocket 会话中每条 CDP 命令；外部 Playwright/Puppeteer 会话自行管理命令超时。 |

将相应值设为 `0` 可禁用该超时。自定义 WebSocket 可通过 `new MCR.WSSession(ws, { timeout: 60000 })` 设置命令超时。断开连接或会话分离时，待处理的 WebSocket 命令会拒绝；CDP 协议错误也会传递给调用方。参见 [CDPClient](/zh/pages/cdp-client#timeouts)。

## 6. 保留现有覆盖率流程 {#_6-keep-existing-coverage-workflows}

无需仅为升级改写 `MCR(options)`、`new CoverageReport()`、`add()`、`addFromDir()` 或 `generate()` 调用。现有报告和过滤选项仍可用，CLI 也能继续采集 CommonJS 程序。新增的 [`mcr test`](/zh/pages/node-test-runner) 和 [`outputFilter`](/zh/pages/filtering#outputfilter) 都是可选项。

### 更新自定义 Reporter 路径 {#update-local-reporter-paths}

自定义 Reporter 通过原生 `import()` 加载。相对路径必须以 `./` 或 `../` 开头、包含扩展名，并以当前工作目录为基准，而不是配置文件所在目录。例如将 `test/custom-v8-reporter.js` 改为 `./test/custom-v8-reporter.js`；否则它会被当成包名。也可使用绝对路径或 `file:` URL。不自动补扩展名，也不自动查找目录入口。

ESM Reporter 用 `export default Reporter` 导出类；如果文件按 Node.js 规则识别为 CommonJS，`module.exports = Reporter` 仍可通过 Node.js 的互操作机制加载。Istanbul Reporter 实现 `execute(context)`；`v8` 和 `both` Reporter 实现 `generate(reportData)`。`both` 通过 `reportData.type` 区分输入，不会同时收到两份独立数据。Reporter 加载或初始化失败会使报告生成失败。参见[自定义报告](/zh/pages/reports#custom-reports)。

### 审查 3.2.0+ 的测试结果产物 {#review-test-result-artifacts-when-upgrading-to-3-2-0}

自 3.2.0 起，即使没有配置 hook，`mcr test` 也会采集结构化测试结果。raw 报告（包括 ZIP）和调试缓存可能包含 `test-results-<id>.json`，其中的测试名称、路径和错误字符串可能含有敏感信息。请检查自动上传和保留策略，必要时使用 [`onTestEnd`](/zh/pages/hooks#ontestend) 在持久化前脱敏。该 hook 不会处理终端输出或已写入的临时文件；导入 raw 产物仍只合并覆盖率，不合并测试结果。其他命令和 API 不会采集这份测试结果。

## 迁移检查清单 {#migration-checklist}

- [ ] 升级本地、CI、容器和相关子进程的 Node.js。
- [ ] 更新 CommonJS、TypeScript、`/util` 和 `/converter` 的导入及同步封装。
- [ ] 检查配置文件格式、显式配置路径和自定义 Reporter 路径。
- [ ] 替换整条命令作为一个参数的写法，检查依赖 shell 的命令。
- [ ] 验证测试、配置加载和报告生成失败时的退出状态。
- [ ] 检查远程 sourcemap 与 CDP 的超时，审查 raw/debug 产物。
- [ ] 重新生成代表性报告，对比文件列表、源码映射、汇总、合并结果和阈值。

完整变更见 [CHANGELOG](https://github.com/cenfun/monocart-coverage-reports/blob/main/CHANGELOG.md)。
