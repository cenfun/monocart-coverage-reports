---
description: 浏览浏览器、Node.js、CSS 和打包源码的原生 V8 与 Istanbul 覆盖率报告。
---

<script setup>
import { withBase } from 'vitepress';
</script>

# 报告演示 {#report-examples}

以下报告由本仓库的测试套件生成。打开报告即可体验文件树、覆盖率指标与源码详情。

## V8 与 Istanbul

| 报告 | 说明 |
| --- | --- |
| <a :href="withBase('/reports/v8/index.html')" target="_blank" rel="noopener noreferrer">V8</a> | 原生 V8 覆盖率，包含字节、语句、分支、函数与行覆盖率指标。 |
| <a :href="withBase('/reports/istanbul/index.html')" target="_blank" rel="noopener noreferrer">Istanbul</a> | 通过插桩采集的 Istanbul HTML 覆盖率报告。 |
| <a :href="withBase('/reports/v8-and-istanbul/v8/index.html')" target="_blank" rel="noopener noreferrer">V8 + Istanbul：V8 报告</a> | 同一份覆盖率数据的原生 V8 视图。 |
| <a :href="withBase('/reports/v8-and-istanbul/istanbul/index.html')" target="_blank" rel="noopener noreferrer">V8 + Istanbul：Istanbul 报告</a> | 将同一份 V8 数据转换为 Istanbul HTML 报告。 |

## 浏览器与 CSS

| 报告 | 说明 |
| --- | --- |
| <a :href="withBase('/reports/puppeteer/index.html')" target="_blank" rel="noopener noreferrer">Puppeteer</a> | 使用 Puppeteer 采集的浏览器覆盖率。 |
| <a :href="withBase('/reports/client/index.html')" target="_blank" rel="noopener noreferrer">CDP 客户端</a> | 通过 CDP 客户端 API 采集的浏览器覆盖率。 |
| <a :href="withBase('/reports/css/index.html')" target="_blank" rel="noopener noreferrer">CSS</a> | 样式表覆盖率，包含预处理器源码映射。 |
| <a :href="withBase('/reports/css-min/index.html')" target="_blank" rel="noopener noreferrer">压缩 CSS</a> | 压缩样式表的覆盖率。 |

## Node.js

| 报告 | 说明 |
| --- | --- |
| <a :href="withBase('/reports/node-env/index.html')" target="_blank" rel="noopener noreferrer">NODE_V8_COVERAGE</a> | 通过 Node.js 环境变量采集的覆盖率。 |
| <a :href="withBase('/reports/node-api/index.html')" target="_blank" rel="noopener noreferrer">Node.js API</a> | 通过 Node.js V8 API 采集的覆盖率。 |
| <a :href="withBase('/reports/node-ins/index.html')" target="_blank" rel="noopener noreferrer">Inspector</a> | 通过 Node.js inspector 会话采集的覆盖率。 |
| <a :href="withBase('/reports/node-cdp/index.html')" target="_blank" rel="noopener noreferrer">Node.js CDP</a> | 通过 Node.js CDP 连接采集的覆盖率。 |
| <a :href="withBase('/reports/node-fgc/index.html')" target="_blank" rel="noopener noreferrer">前台子进程</a> | 子进程覆盖率采集。 |
| <a :href="withBase('/reports/node-vm/index.html')" target="_blank" rel="noopener noreferrer">VM</a> | Node.js VM 上下文中执行代码的覆盖率。 |
| <a :href="withBase('/reports/node-koa/index.html')" target="_blank" rel="noopener noreferrer">Koa</a> | Koa 应用的服务端覆盖率。 |
| <a :href="withBase('/reports/node-ts/index.html')" target="_blank" rel="noopener noreferrer">原生 TypeScript</a> | `npm run test-node-ts`：使用 Node 执行 TS，报告展示原始 TS；参见 [TypeScript 支持](/zh/reference/typescript#repository-examples)。 |
| <a :href="withBase('/reports/mcr-test-ts/index.html')" target="_blank" rel="noopener noreferrer">TypeScript 测试</a> | `npm run test-mcr-test-ts`：使用 `mcr test` 运行原生 TS 测试。 |

## 打包工具与源码映射

| 报告 | 说明 |
| --- | --- |
| <a :href="withBase('/reports/esbuild/index.html')" target="_blank" rel="noopener noreferrer">esbuild</a> | esbuild 产物的源码映射覆盖率。 |
| <a :href="withBase('/reports/rollup/index.html')" target="_blank" rel="noopener noreferrer">Rollup</a> | Rollup 产物的源码映射覆盖率。 |
| <a :href="withBase('/reports/swc/index.html')" target="_blank" rel="noopener noreferrer">SWC</a> | SWC 产物的源码映射覆盖率。 |
| <a :href="withBase('/reports/minify/index.html')" target="_blank" rel="noopener noreferrer">压缩 JavaScript</a> | 将压缩后的 JavaScript 覆盖率映射回原始源码。 |
| <a :href="withBase('/reports/sections/index.html')" target="_blank" rel="noopener noreferrer">分段源码映射</a> | 包含 sections 的索引式 source map 覆盖率。 |

## CLI、合并与项目覆盖率

| 报告 | 说明 |
| --- | --- |
| <a :href="withBase('/reports/cli/index.html')" target="_blank" rel="noopener noreferrer">CLI</a> | 使用 MCR 命令行生成的覆盖率。 |
| <a :href="withBase('/reports/merge/index.html')" target="_blank" rel="noopener noreferrer">合并覆盖率</a> | 合并多份原始覆盖率数据后生成的报告。 |
| <a :href="withBase('/reports/mcr/index.html')" target="_blank" rel="noopener noreferrer">MCR 项目覆盖率</a> | 运行测试套件时采集的 MCR 自身覆盖率。 |

::: tip 本地预览
此列表是文档的一部分，无需生成报告即可展示。本地打开具体报告前，请先运行对应测试，将报告生成到 `.temp/site/reports/`。构建与浏览器前置要求请参阅[贡献指南](/zh/more/contributing#contributing)。
:::
