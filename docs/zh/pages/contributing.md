# 贡献指南 {#contributing}

## AI 辅助开发 {#ai-assisted-development}

如果使用 AI 编程助手参与 MCR 开发，请从仓库根目录开始，并让助手在修改前阅读 [`AGENTS.md`](https://github.com/cenfun/monocart-coverage-reports/blob/main/AGENTS.md)。这是本仓库面向 AI 编程助手的通用指南，不依赖特定工具。它说明了相关源码和测试的位置、应运行哪些检查，以及哪些命令和生成产物需要特别留意。

向助手说明任务范围和预期结果，要求它只做与任务相关的修改，并报告实际运行的检查。提交拉取请求前，请审阅改动和检查结果。

`AGENTS.md` 用于开发 MCR 本身。如果要让助手在其他项目中集成 MCR，请参阅 [AI Agent 技能](/zh/pages/ai-agent-skill)。

## 开发环境与命令 {#development}

- 推荐使用最新 Node.js 24 LTS 开发；最低运行版本见 `package.json` 的 engines。开发工具可能要求更新的补丁版本。
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

迁移指南按目标主版本命名为 `docs/pages/migration-to-<major>.md` 和 `docs/zh/pages/migration-to-<major>.md`，新增主版本时保留旧版指南。在 `docs/.vitepress/pages.js` 的 `migrations`（迁移升级）分组中添加不带扩展名的 `migration-to-<major>`。公开地址为 `/pages/migration-to-<major>.html` 和 `/zh/pages/migration-to-<major>.html`。英文 `docs/pages/migration-to-*.md` 指南会自动随 npm 包发布。

## 文档预览与验证 {#documentation-workflow}

```sh
npm ci
npm run docs:dev
npm run docs
npm run docs:preview
```

## 首页使用者名单 {#homepage-adopters}

运行 `npm run who`，在 `.temp/who/results.json` 中预览 **谁在使用 MCR** 的名单。运行 `npm run who -- --write` 将候选池保存到 `scripts/who/who.pool.json`，将核实后的名单保存到首页读取的 `scripts/who/who.filterred.json`。加上 `--refresh` 可跳过缓存。对于没有人工审核证据的候选项目，脚本会检查默认分支上任意 `package.json` 的 `dependencies`、`devDependencies` 或 `optionalDependencies` 中是否声明了 `monocart-coverage-reports`。文件可以位于根目录或子目录，无需提供调用 `mcr` 的 npm 脚本。

命令遍历 GitHub Dependents 的两个公开分页列表，对仓库去重，再按每条记录中的 Star 数从高到低排序。报告同时记录页面标称总数和实际可见的条数，因为 GitHub 页头的总数可能大于公开分页能查询到的条数。

候选池仅收录 GitHub Star 数严格超过 1,000 的仓库。命令会核实这些仓库的状态，跳过 fork、已归档或状态无法确认的仓库。

第二步仅核实候选池中的项目，排除 `cenfun` 名下的仓库、已在首页 **集成 MCR** 中展示的仓库，以及默认分支没有 MCR 使用证据的候选。对于新候选，命令会检查根 `package.json` 是否声明了 MCR 依赖且实际调用 `mcr` 命令。在 [`scripts/who/who.sources.js`](https://github.com/cenfun/monocart-coverage-reports/blob/main/scripts/who/who.sources.js) 中维护已核实的证据文件和手动覆盖项。手动覆盖不会绕过候选池或核实规则，也不会改变 Star 排序。首页卡片链接到仓库，每项另存使用文件的位置供后续复核。与感谢页一样，卡片使用仓库所属组织或个人的 GitHub 头像；命令会自动记录头像地址。

## 文档代码检查 {#documentation-linting}

`npm run lint:docs` 默认直接使用 ESLint 检查并自动修复 `docs/` 中的 VitePress 配置、Vue 主题，以及文档和 `README.md` 内的 JavaScript 代码块。官方 `@eslint/markdown` 处理器会将错误位置及自动修复映射回 Markdown 源文件。`js`、`javascript`、`mjs`、`cjs` 代码块沿用项目的语法与格式规则，也支持 `js{1,3-5}:line-numbers` 等 VitePress 标注与代码组文件名。仅对省略上下文的片段关闭 `no-undef` 和 `no-unused-vars`，其他正确性规则保持启用。TypeScript（`ts`）与文本代码块不会被当成 JavaScript 检查；Markdown 正文也不会被重新排版。

刻意保留非标准语法的演示可继续使用 `js` 高亮，在对应代码围栏前紧接一行 `<!-- eslint-skip -->`。它只跳过紧随其后的代码块，包括自动修复；多个例外需要逐个标记。不要用 JavaScript `eslint-disable` 注释隐藏普通示例中的错误。仓库的 VSCode 配置已启用 Markdown 的 ESLint 校验与格式修复。

```sh
npm run lint:docs             # 检查并自动修复
npm run lint:docs -- --no-fix # 仅检查（docs 也使用此模式）
```

## 生成产物与报告 {#generated-output}

所有文档产物都在 `.temp/`：站点输出为 `.temp/site/`，缓存为 `.temp/vitepress-cache/`，SSR 中间文件为 `.temp/vitepress-ssr/`。测试报告直接生成到 `.temp/site/reports/`；演示列表直接维护在 VitePress 页面 `docs/pages/examples.md` 与 `docs/zh/pages/examples.md` 中，链接指向各报告。报告的 HTML、数据与资源统一使用 `/monocart-coverage-reports/reports/` 下的新地址，不兼容旧地址。

`npm run docs:dev` 会直接提供 `.temp/site/reports/` 中已有报告的静态访问，不修改报告 HTML 或脚本。**报告演示**页面无需生成报告即可展示。本地打开具体报告前，请先运行对应的仓库测试。报告缺失时返回 404 并提示这些步骤；开发服务器不会自动运行测试。

## 清理与发布 {#cleanup-and-publishing}

`npm run docs:build`（`docs` 也会调用）在构建前清理 `reports/` 以外的旧站点产物，避免已删除的页面、旧报告跳转页和带哈希的资源文件不断累积。集成测试组（`test-node`、`test-browser`、`test-all`）清理站点根目录中带标记的旧报告跳转目录，保留文档与已有报告；每份新报告生成时清理自己的输出目录。两种流程都不会整体清空 `reports/` 中的报告或 raw 合并输入。

本地需要彻底清理时，只清理专用的 `.temp/site/` 输出目录，然后重新构建文档和运行所需的报告测试。不要清理或生成覆盖 `docs/`。CI 分别构建文档与测试报告，最终合并到同一站点目录发布。
