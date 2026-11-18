# 贡献指南 {#contributing}

## 开发环境与命令 {#development}

- 推荐使用最新 Node.js 24 LTS 开发；包的最低运行版本为 22.15.0。开发工具可能要求高于最低运行版本的补丁版本。
- VSCode (extensions: eslint/stylelint/vue)
```sh
npm install
npx playwright install --with-deps

npm run build
npm run lint
npm run test

npm run dev
```

## 源码格式与安全约束 {#formatting-and-safety}

保留 UTF-8 编码，并按 `.gitattributes` 的要求统一使用 LF 换行。LF 与 CRLF 占用的字符数不同，会改变源码长度和覆盖范围偏移，导致不同操作系统执行 `npm run test` 时，覆盖报告中的 `bytes` 统计值不一致，即使代码逻辑没有变化，覆盖率快照（snapshot）检查也可能失败。

`npm run eol` 用于修复已有工作副本中的换行不一致问题：重建 Git 索引，并按照仓库的换行规则重新检出跟踪文件。如果快照失败是由换行差异引起的，应先统一工作副本的换行，不要通过更新快照基线来接受这种差异。

::: danger 具有破坏性的修复命令
`npm run eol` 实际执行 `git rm -rf --cached . && git reset --hard HEAD`，会清空暂存区并丢弃跟踪文件中尚未提交的改动。考虑使用前，务必先提交或备份工作内容。不要将其作为日常验证或格式化命令。
:::

## 文档与报告站点 {#documentation-and-report-site}

`docs/` 是提交到 Git 的 VitePress 源码；英文页面与 `zh/` 页面使用对应的文件名。修改功能时同步更新双语文档。

迁移指南按目标主版本命名为 `docs/migrations/migration-to-<major>.md` 和 `docs/zh/migrations/migration-to-<major>.md`，新增主版本时保留旧版指南。在 `docs/.vitepress/pages.js` 的 `migrations` 分组中添加对应条目，双语侧栏共用此列表。英文 `docs/migrations/migration-to-*.md` 指南会自动随 npm 包发布。

## 文档预览与验证 {#documentation-workflow}

```sh
npm ci
npm run docs:dev
npm run docs:check
npm run docs:preview
```

## 文档代码检查 {#documentation-linting}

`npm run lint:docs` 默认直接使用 ESLint 检查并自动修复 `docs/` 中的 VitePress 配置、Vue 主题，以及文档和 `README.md` 内的 JavaScript 代码块。官方 `@eslint/markdown` 处理器会将错误位置及自动修复映射回 Markdown 源文件。`js`、`javascript`、`mjs`、`cjs` 代码块沿用项目的语法与格式规则，也支持 `js{1,3-5}:line-numbers` 等 VitePress 标注与代码组文件名。仅对省略上下文的片段关闭 `no-undef` 和 `no-unused-vars`，其他正确性规则保持启用。TypeScript（`ts`）与文本代码块不会被当成 JavaScript 检查；Markdown 正文也不会被重新排版。

刻意保留非标准语法的演示可继续使用 `js` 高亮，在对应代码围栏前紧接一行 `<!-- eslint-skip -->`。它只跳过紧随其后的代码块，包括自动修复；多个例外需要逐个标记。不要用 JavaScript `eslint-disable` 注释隐藏普通示例中的错误。仓库的 VSCode 配置已启用 Markdown 的 ESLint 校验与格式修复。

```sh
npm run lint:docs             # 检查并自动修复
npm run lint:docs -- --no-fix # 仅检查（docs:check 也使用此模式）
```

## 生成产物与报告 {#generated-output}

所有文档产物都在 `.temp/`：站点输出为 `.temp/site/`，缓存为 `.temp/vitepress-cache/`，SSR 中间文件为 `.temp/vitepress-ssr/`。测试报告直接生成到 `.temp/site/reports/`；演示列表直接维护在 VitePress 页面 `docs/getting-started/examples.md` 与 `docs/zh/getting-started/examples.md` 中，链接指向各报告。报告的 HTML、数据与资源统一使用 `/monocart-coverage-reports/reports/` 下的新地址，不兼容旧地址。

`npm run docs:dev` 会直接提供 `.temp/site/reports/` 中已有报告的静态访问，不修改报告 HTML 或脚本。**报告演示**页面无需生成报告即可展示。本地打开具体报告前，请先运行对应的仓库测试。报告缺失时返回 404 并提示这些步骤；开发服务器不会自动运行测试。

## 清理与发布 {#cleanup-and-publishing}

文档重建保留已有报告。本地需要彻底清理时，只清理专用的 `.temp/site/` 输出目录，然后重新构建文档和运行所需的报告测试。不要清理或生成覆盖 `docs/`。CI 分别构建文档与测试报告，最终合并到同一站点目录发布。
