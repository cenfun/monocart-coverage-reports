# TypeScript 支持 {#typescript-support}

::: warning 仅适用于 Node.js
本页介绍的直接执行 TypeScript 及对应覆盖率支持**仅适用于 Node.js，不适用于浏览器**。浏览器应用仍需先将 TS 构建为 JavaScript，采集实际执行的 JS 覆盖率，再通过 sourcemap 映射回原始 TS。`typescript` 配置不会让浏览器直接执行 TS，也不会替代现有的构建/sourcemap 流程。
:::

MCR 可以为 Node.js 直接执行的 TypeScript 生成原生 V8 覆盖率报告。对于 Node 支持的**可擦除 TypeScript 语法**，不需要构建步骤、`tsx`、`ts-node`，也不需要额外安装 TS 解析器：

```sh
npx mcr node ./src/example.ts
npx mcr test "./test/*.test.ts"
```

这是 Node.js 的原生执行能力，不是 MCR 内置了一套 TypeScript 编译器。需要 loader 或构建/sourcemap 的项目，仍可使用现有接入方式。

## Node.js 要求 {#nodejs-requirements}

MCR 要求 **Node.js >= 22.18.0**。受支持的 LTS 版本默认启用原生类型擦除，本页命令无需额外执行参数。推荐使用 Node.js 24.12+ 或 Node.js 26，通过 `node --version` 检查启动 MCR 的 Node 版本。

| Node.js LTS 版本线 | 原生 TS 执行 |
| --- | --- |
| 22.x（22.18+） | 默认启用，执行功能不再输出实验性警告。 |
| 24.x | 默认启用，从 24.12 开始类型擦除被标记为稳定。 |
| 26.x | 默认启用。 |

不再支持更早的 Node.js 22 版本。测试发现及可用的 JavaScript/TypeScript 语法仍以当前安装的 Node.js 版本为准。

MCR 使用 Node 内置的 `module.stripTypeScriptTypes()` 进行分析。该 API 有独立的稳定性状态：某些 Node.js 版本（包括 Node 24）在生成报告时仍可能输出实验性警告，即使直接执行 TS 已经稳定。MCR 不会全局屏蔽 Node 的警告。

运行时能力与语法限制参见 [Node.js TypeScript 文档](https://nodejs.org/api/typescript.html)。

## 运行 TS 程序 {#run-a-ts-program}

使用 ESM `.ts` 文件时，在项目的 `package.json` 中设置 `"type": "module"`。将以下内容保存为 `src/math.ts`：

```ts
export interface Input {
    value: number;
}

export function magnitude(input: Input): number {
    if (input.value < 0) {
        return -input.value;
    } else {
        return input.value;
    }
}
```

创建 `src/example.ts`：

```ts
import { magnitude } from './math.ts';

console.log(magnitude({ value: -2 }));
```

安装 MCR 并运行程序：

```sh
npm i -D monocart-coverage-reports
npx mcr node ./src/example.ts -r v8,console-summary -o ./coverage-reports
```

打开 `coverage-reports/index.html`。报告展示保留类型信息的原始 TS，语句、函数、分支和可执行行则基于 Node 擦除类型后的 JavaScript 分析。本例只执行负数分支。

## 运行 TS 测试 {#run-ts-tests}

创建 `test/math.test.ts`：

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magnitude } from '../src/math.ts';

test('negative input', (): void => {
    assert.equal(magnitude({ value: -2 }), 2);
});
```

一条命令调用 Node 内置测试运行器并生成覆盖率报告：

```sh
npx mcr test "./test/*.test.ts" -r v8,console-summary -o ./coverage-reports
```

- 给 glob 加引号，由 Node 而不是 shell 展开。嵌套测试可使用 `"./test/**/*.test.ts"` 等模式。
- MCR 将目标传给 `node --test`。测试发现与 glob 支持取决于当前 Node.js 版本；MCR 不另行实现 TS 测试发现机制。
- 测试可以使用 `node:test` 和 `node:assert/strict`，无需额外测试运行器。
- 测试失败时仍生成可用的覆盖率报告，并保留非零退出状态。报告生成失败也会非零退出。

测试运行器参数和测试结果 hook 参见[使用 mcr test 运行测试](/zh/getting-started/node-test-runner#run-tests-with-mcr-test)。

## 配置覆盖率 {#configure-coverage}

原生 `mcr.config.ts` 可以直接使用类型导入和 `satisfies`，无需预加载 loader：

```ts
import type { McrCliOptions } from 'monocart-coverage-reports';

export default {
    test: './test/**/*.test.ts',
    reports: ['v8', 'console-summary'],
    outputDir: './coverage-reports',
    entryFilter: '**/src/**',
    all: {
        dir: './src',
        filter: {
            '**/*.d.ts': false,
            '**/*.ts': true,
            '**/*.mts': true,
            '**/*.cts': true
        }
    }
} satisfies McrCliOptions;
```

```sh
npx mcr node ./src/example.ts
# 使用配置中的测试目标
npx mcr test
# 也可以显式覆盖目标
npx mcr test "./test/*.test.ts"
```

`entryFilter` 只保留应用源码，不包含测试文件。当保留的覆盖率中包含 MCR 捕获的 Node 原生 TS 时，`all` 也能无需 transformer 分析未执行的可擦除 TS，并将其中运行时函数、分支和语句计为未覆盖。对于其他 TS 方言，保留原有的未执行文件回退行为：源码计为未覆盖，但无法推导运行时函数、分支和语句。要获取这些 AST 指标，需要适当的 transformer 和 sourcemap。参见[未测试文件](/zh/reference/untested-files#untested-files)。

为避免改变已有浏览器/打包器报告，只使用 `all`、所有原生 TS 条目均被过滤，或未保留原生运行时身份的报告，均维持原有的未执行文件行为。这些流程需要分析原始可擦除 TS 时，可以设置 `typescript: true`；其他语法应通过 `all.transformer` 提供 sourcemap，已有 transformer 始终优先。

MCR 在其他默认配置文件之后查找 `mcr.config.ts`，已有的 `mcr.config.js` 优先。可使用 `-c ./mcr.config.ts` 显式指定。相对路径以当前工作目录为基准。

## 分析策略 {#analysis-policy}

仅用于 V8 的 [`typescript` 配置项](/zh/reference/options#typescript)默认为 `null`：

| 值 | 模式 |
| --- | --- |
| 未指定、`undefined`、`null`、`{}`、`{ enabled: undefined }` | 保守的自动识别。 |
| `true` 或 `{ enabled: true }` | 强制分析符合条件的原始 TS，即使没有加载身份信息。 |
| `false` 或 `{ enabled: false }` | 关闭 MCR 的 TS 分析，包括已确认的原生 TS。 |
| `(info) => result` | 对每个符合条件的文件分别生成最终配置。 |
| `{ enabled: (info) => boolean }` | 对每个符合条件的文件决定是否启用分析。 |

自动模式使用已确认的 Node 原生加载身份，以及关联到该原生采集上下文的未执行文件。**不会**因为 JavaScript 解析失败，就尝试处理任意看起来像 TS 的源码，以保持既有浏览器、loader 和打包器流程不变。

强制模式只适用于符合条件的 `.ts`、`.mts`、`.cts` 原始源码或具有明确原生身份的源码。不会重新解释普通 JS/CSS、fake 源码、带 sourcemap 的转换后 JS，或显式 `all.transformer` 的输出，也不会增加对非可擦除语法的支持。

对于仅使用 `all` 的报告，或未使用 MCR 预加载模块采集的原始 Node TS 数据，可以显式开启：

```js
export default {
    typescript: true,
    all: {
        dir: './src',
        filter: '**/*.ts'
    },
    reports: ['v8']
};
```

CLI 也支持布尔覆盖参数：

```sh
npx mcr --typescript node ./src/example.ts
npx mcr --no-typescript node ./src/example.ts
npx mcr --typescript merge --inputDir ./raw
```

不传这两个参数时保留配置文件中的值；没有配置时自动识别。对象和回调应写在配置文件或 API options 中，而不是作为 CLI 参数值传入。

**关闭分析不会禁止 Node 执行 TS。** MCR 会使用原有 JS/回退路径，这可能无法为原始 TS 提供准确的 AST 或行指标。若关闭 TS 分析后仍要求准确覆盖率，请提供转换后的 JS 及可用 sourcemap。

## 文件回调 {#file-callbacks}

两种回调是替代写法，不会组成回调链：

```js
export default {
    typescript: (info) => ({
        enabled: info.nativeTypeScript || info.sourcePath.startsWith('src/native/')
    })
};
```

或者：

```js
export default {
    typescript: {
        enabled: (info) => info.nativeTypeScript || info.empty
    }
};
```

回调对**每个符合条件的运行时 URL/路径/采集上下文组合或选中的未执行文件调用一次**，发生在报告聚合之前，不是每份报告只调用一次，也不只针对最外层程序入口。同一文件与路径的重复执行，仅在加载事实和脚本坐标范围一致时才会先合并；不同运行时 URL 即使最终报告路径相同，也保留各自的分析决策。运行时 entry 过滤器和未执行文件过滤器先于对应回调执行。普通 JS/CSS、fake 源码、带 sourcemap 的转换后 JS，以及显式 `all.transformer` 的输出，不会触发回调。

顶层回调可返回布尔值、`null`、`undefined` 或最终的 `{ enabled?: boolean }` 配置；未指定 `enabled` 表示自动。对象中的 `enabled` 回调必须返回布尔值。两种回调都不能返回 Promise；顶层回调也不能返回另一个函数，或包含 `enabled` 回调的对象，以保证每次文件决策只执行一个用户回调。

只读的 [`TypeScriptFileInfo`](/zh/reference/types#typescriptfileinfo) 包含：

| 字段 | 含义 |
| --- | --- |
| `url` | 原始执行 URL，未执行文件则为对应文件 URL。 |
| `sourcePath` | 规范化后的报告路径，包含 `sourcePath` 重写结果。 |
| `nativeTypeScript` | 已确认的 Node 原生加载事实。`false` 表示未确认，不代表一定不是 TS。 |
| `empty` | 是否为未执行覆盖率条目。 |

`nativeTypeScript` 来自 Node 的 `module-typescript` / `commonjs-typescript` 加载格式，不是根据扩展名或本次解析决策推断。未执行文件始终为 `nativeTypeScript: false`，即使它关联到原生 TS 采集上下文。开启分析不会改变这个事实。

原生加载事实仅属于各自的采集上下文。同一原始 TS 的另一次执行若缺少原生身份，请在适用时显式启用该次执行的分析；自动模式不会借用其他原生副本的身份。分析源码不兼容时仍会拒绝聚合。

回调参数是冻结的独立描述对象，不是可修改的覆盖率条目。回调必须同步执行，且不能修改该对象。回调抛错、返回非法类型，或使用 `endabled` 等错误配置时，报告生成会失败，不会静默回退。当前对象仅支持 `enabled`，`filter` 等额外设置留待后续设计，目前不接受。

返回 `false` 仅改变分析分支，不会从报告中排除文件。排除文件请使用覆盖率过滤器。

## 统计语义 {#coverage-semantics}

- **原始源码：** CLI 的源码捕获 hook 会保存原生 `.ts`、`.mts` 和 `.cts` 的原始文本，即使没有 sourcemap。请勿在采集与生成报告之间修改源码；应保存同一次执行对应的源码和覆盖率，尤其是未使用 MCR 预加载模块进行采集时。
- **AST 与行：** MCR 分析 Node 在 `strip` 模式下生成、保留代码位置的 JavaScript。类型声明、重载签名和纯类型导入不计为可执行语句或可执行行。整行被擦除的类型内容在覆盖率中分类为空白，源码视图仍保留类型信息。
- **纯类型模块：** 不含运行时函数、分支、语句和可执行行。通过上述原生 TS 上下文中的 `all` 纳入时也一样。
- **字节：** 保持 MCR 基于源码文本的统计口径，包括原始源码长度。字节覆盖率不是“可执行 TS token”的度量，纯类型文件也可能对该指标产生贡献。
- **Raw 报告：** 保留原始源码、V8 范围、原生加载事实及未执行文件的采集上下文，以供后续合并。不会永久保存解析决策，每次生成都使用本次的 `typescript` 配置：`false` 可以覆盖已保存的原生身份，曾手动强制分析的无身份数据在合并时也需要再次开启。建议采集和重新生成报告使用相同 Node.js 版本，因为 Node 的 TS 解析器可能随版本变化。
- **运行时身份：** MCR 预加载模块记录 Node 是否确实加载了原生 TS，并通过 raw 报告保留这一信息。自动模式下，其他输入保留原有 JS 路径：不会仅凭 `.ts` 执行 URL 或 JS 解析失败就启用擦除或 BOM 偏移调整。
- **Sourcemap：** 转换后的运行时代码带有可用 sourcemap 时，MCR 保留现有的“生成代码映射回原始源码”路径，不把映射后的原始 TS 当作原生运行时代码重新处理。

普通原生 TS CLI 执行使用默认自动模式即可，无需额外配置。

## 支持的语法 {#supported-syntax}

Node 的可擦除语法包括类型标注、接口、类型别名、类型导入/导出、泛型参数、重载签名、`as`、`satisfies` 和非空断言。当前 Node.js 也支持只包含类型的 `namespace`。

请选择合适的文件与模块格式：

| 扩展名 | 模块系统 |
| --- | --- |
| `.ts` | 与 `.js` 相同；使用 ESM 时设置 `"type": "module"`。 |
| `.mts` | 始终为 ESM。 |
| `.cts` | 始终为 CommonJS，运行时导出使用 CommonJS 写法。 |

相对导入要写实际扩展名，例如 `import './math.ts'`。仅用于类型的导入必须使用 `import type`。本功能不会在 `.js` 文件中启用类型标注。

## 使用限制 {#limitations}

- **不做类型检查。** 如有需要，单独运行 `tsc --noEmit`。执行和覆盖率采集本身不要求安装 TypeScript。
- **不应用 `tsconfig.json` 执行设置。** Node 不解析 `paths` 别名，不转换模块系统，也不按 `target` 降级 JavaScript。
- **不支持 TSX/JSX。** React/JSX 源码应使用适当的 loader 或构建工具。
- **不转换非可擦除 TS。** 例如 `enum`、构造函数参数属性、包含运行时代码的 `namespace`、TypeScript 导入别名。MCR 不会开启 `--experimental-transform-types`，也不会静默切换其他编译器。自动模式下，不支持的未执行 TS 保留原有的无 AST 指标回退；显式强制开启时，不支持的语法会导致分析失败。非可擦除语法需要通过 `all.transformer` 提供带 sourcemap 的转换结果，才能获取准确的函数、分支和语句数。
- **不转换装饰器。** 使用能够处理项目所用装饰器语义的工具链。
- **不是直接发布 TS 依赖的捷径。** Node 通常拒绝擦除 `node_modules` 下的 TS；发布库时一般仍应提供编译后的 JS，或采用其他受支持的分发方式。
- **不是浏览器原生执行 TS。** 浏览器和打包器仍需保留现有的编译/sourcemap 流程。

项目超出这些限制时，可以自行安装合适的运行时，例如 `tsx`，继续使用原有工作流：

```sh
npm i -D tsx
npx mcr --import tsx node ./src/example.ts
npx mcr --import tsx test "./test/*.test.ts"
```

对于需要转换的未执行文件，还应配置合适的 `all.transformer`。参见[框架与工具](/zh/integrations/frameworks-and-tools#typescript)和[未测试文件](/zh/reference/untested-files#transform-source-code)。

## 仓库示例 {#repository-examples}

在 MCR 源码仓库中安装依赖并构建运行时包后，运行：

```sh
npm run test-node-ts
npm run test-mcr-test-ts
```

它们直接执行独立的 `test/node-ts/` 案例，不构建这些 TS 文件，也不加载 `tsx`。前者使用 `mcr node`，后者使用 `mcr test`。配置文件分别是 `test/mcr.config.node-ts.ts` 和 `test/mcr.config.mcr-test-ts.ts`。

报告分别生成到 `.temp/site/reports/node-ts/index.html` 和 `.temp/site/reports/mcr-test-ts/index.html`。示例覆盖 `.ts`、`.mts`、`.cts`、纯类型模块及未执行 TS。在线链接参见[报告示例](/zh/getting-started/examples#report-examples)。
