# 开始使用 {#get-started}

Monocart Coverage Reports（MCR）将 JavaScript、TypeScript 和 CSS 覆盖率数据生成 HTML 等格式的报告。

## 安装 {#installation}

需要 [Node.js >= 22.15.0](https://nodejs.org/)。在项目目录中安装（新项目先运行 `npm init -y`）：

```sh
npm i monocart-coverage-reports -D
```

**自 v3 起，MCR 为 ESM-only。** CommonJS 项目可以通过 `import()` 异步导入，接入方式及 2.x 升级说明参见[迁移指南](/zh/migrations/migration-to-3)。

## API {#api}

已有采集数据时，接上以下代码生成报告：

```js
import { MCR } from 'monocart-coverage-reports';

const mcr = MCR({
    outputDir: './coverage-reports',
    reports: ['v8', 'console-summary'],
    cleanCache: true
});
await mcr.add(coverageData);
const coverageResults = await mcr.generate();
if (!coverageResults) {
    throw new Error('No coverage report was generated');
}
console.log(coverageResults.reportPath);
```

### 数据与结果 {#coverage-data}

`coverageData` 是采集得到的 V8 覆盖率数据，获取方式参见 [V8 采集](/zh/coverage-collection/v8)。

`coverageResults` 是 `generate()` 返回的输出结果，字段说明参见 [`CoverageResults`](/zh/reference/types#coverageresults)。

### 配置 {#load-config}

参见[配置文件](/zh/reference/configuration#minimal-config)、[API 加载配置](/zh/reference/configuration#api)和[配置选项](/zh/reference/options)。

## CLI {#cli}

对于使用 Node.js 内置测试运行器的项目，建议从[使用 mcr test 运行测试](/zh/getting-started/node-test-runner#quick-start)开始：一条命令完成测试执行、覆盖率采集和报告生成，无需配置文件。

### 生成第一份报告 {#first-report}

如果还没有测试文件，也可以创建 `demo.js`，先用简单脚本体验覆盖率采集：

```js
console.log('Hello, MCR!');
```

运行并采集覆盖率：

```sh
npx mcr node demo.js -r v8,console-summary -o ./coverage-reports
```

用浏览器打开 `./coverage-reports/index.html`，终端也会输出覆盖率概要。请使用专用输出目录：[默认会清理之前的报告输出](/zh/reference/options#clean)。

将 `node demo.js` 替换为自己的 Node.js 命令即可。更多用法参见 [CLI 参数](/zh/reference/cli)。

更多内容：[报告格式](/zh/reference/reports)、[框架集成](/zh/integrations/frameworks-and-tools)和[报告示例](/zh/getting-started/examples)。
