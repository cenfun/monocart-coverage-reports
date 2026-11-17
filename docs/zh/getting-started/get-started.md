# 开始使用 {#usage}
> **MCR 3.x 的所有 API 和 CLI 命令均要求 [Node.js >= 22.15.0](https://nodejs.org/)**，包括普通命令、`merge` 和 `test`。

**从 2.x 升级：** 请参阅 [3.x 迁移指南](/zh/migrations/migration-to-3)。

## 安装 {#installation}

安装为开发依赖：

```sh
npm i monocart-coverage-reports -D
```

## CLI {#cli}

```sh
# 使用 Node.js 测试运行器执行测试并采集原生 V8 覆盖率
npx mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
# 或者为任意 Node.js 命令采集覆盖率
npx mcr node my-app.js -r v8,console-details
```
参见[命令行](/zh/reference/cli#command-line)和[使用 `mcr test` 运行测试](/zh/getting-started/node-test-runner#run-tests-with-mcr-test)

## API {#api}

```js
import { MCR } from 'monocart-coverage-reports';
const mcr = MCR({
    name: 'My Coverage Report - 2024-02-28',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-details'],
    cleanCache: true
});
await mcr.add(coverageData);
await mcr.generate();
```

### 加载配置文件 {#load-config}

也可以使用ESM的 `import` 然后加载[配置文件](/zh/reference/configuration#config-file)
```js
import { CoverageReport } from 'monocart-coverage-reports';
const mcr = new CoverageReport();
await mcr.loadConfig();
```
> `MCR({...})` 和 `new CoverageReport()` 创建的是同一个实例。`MCR()` 是简写工厂函数；`new CoverageReport()` 更适合需要单独调用 `loadConfig()` 的场景。

参见 [多进程支持](/zh/reference/multiprocessing#multiprocessing-support)
