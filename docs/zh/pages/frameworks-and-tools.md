# 框架与工具 {#frameworks-and-tools}

按用途查找集成：[Node.js test runner](#node-test-runner)、[浏览器测试](#playwright)、[Vitest 与 Jest](#vitest)、[TypeScript](#typescript)或 [VS Code](#vscode)。没有现成方案时，参见[通用接入方式](/zh/pages/integrate-with-your-framework)。

## [Node.js test runner](https://nodejs.org/docs/latest/api/test.html) {#node-test-runner}

**推荐：** 直接使用 `mcr test`，一条命令即可用 Node.js 内置测试运行器执行测试并生成覆盖率报告。参见[使用 mcr test 运行测试](/zh/pages/node-test-runner#run-tests-with-mcr-test)。

如果需要为现有的 `node --test` 流程配置自定义覆盖率 Reporter，可以使用 [node-monocart-coverage](https://github.com/cenfun/node-monocart-coverage)。

## [Playwright](https://playwright.dev/) {#playwright}

覆盖率采集代码参见 [使用 Playwright 采集 V8 覆盖率](/zh/pages/v8#playwright)。

- [playwright-coverage](https://github.com/cenfun/playwright-coverage)：Playwright 覆盖率完整示例
- [playwright-bdd-coverage](https://github.com/cenfun/playwright-bdd-coverage)：Playwright BDD 覆盖率示例
- [monocart-reporter](https://github.com/cenfun/monocart-reporter)：支持[覆盖率报告](https://github.com/cenfun/monocart-reporter#code-coverage-report)的 Playwright Reporter
- 使用 `monocart-reporter` 采集组件测试覆盖率：
    - [playwright-ct-vue](https://github.com/cenfun/playwright-ct-vue)
    - [playwright-ct-react](https://github.com/cenfun/playwright-ct-react)
    - [playwright-ct-svelte](https://github.com/cenfun/playwright-ct-svelte)
- 采集 Next.js 服务端和客户端覆盖率：
    - [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
    - [nextjs-with-playwright-istanbul](https://github.com/cenfun/nextjs-with-playwright-istanbul)
- 采集 Remix 覆盖率：
    - [remix-with-playwright](https://github.com/cenfun/remix-with-playwright)

::: info 下一步
在 CI 中分片运行 Playwright，或另有一套单元测试？从各次运行分别导出原始覆盖率数据，再合并为一份报告。

[合并 Playwright 覆盖率](/zh/pages/merging#manual-merging)
:::

## [Puppeteer](https://pptr.dev/) {#puppeteer}

覆盖率采集代码参见 [使用 Puppeteer 采集 V8 覆盖率](/zh/pages/v8#puppeteer)。

- [jest-puppeteer-coverage](https://github.com/cenfun/jest-puppeteer-coverage)：用 Jest 和 Puppeteer 采集覆盖率
- [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)：Jest 单元测试、Puppeteer 端到端测试与 Codecov 集成示例

## [Vitest](https://github.com/vitest-dev/vitest) {#vitest}
- [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage)：Vitest 覆盖率 Provider
- [merge-code-coverage-vitest](https://github.com/cenfun/merge-code-coverage-vitest)：合并 Vitest 单元测试与 Playwright 端到端分片的覆盖率

::: info 下一步
将 Vitest 单元测试与端到端测试的覆盖率合并，查看两套测试一共覆盖了哪些代码。

[合并 Vitest 覆盖率](/zh/pages/merging#unit-test-coverage)
:::

## [Jest](https://github.com/jestjs/jest/) {#jest}
- [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage)：Jest 覆盖率 Reporter
- [merge-code-coverage](https://github.com/cenfun/merge-code-coverage)：合并 Jest 单元测试与 Playwright 端到端分片的覆盖率

::: info 下一步
将 Jest 单元测试与 Playwright 端到端测试的覆盖率合并到同一份报告。

[合并 Jest 覆盖率](/zh/pages/merging#unit-test-coverage)
:::

## [TypeScript](https://github.com/microsoft/typescript) {#typescript}

在 Node.js 22.18.0 或更高版本上，推荐使用内置的类型擦除直接运行只含可擦除语法的 TypeScript，无需构建步骤或外部 loader。

```sh
npx mcr node ./src/example.ts
npx mcr test "./test/**/*.test.ts"
```

配置和覆盖率行为参见 [TypeScript 支持](/zh/pages/typescript#typescript-support)。`tsx` 和 `ts-node` 示例参见[外部加载器](/zh/pages/typescript#external-loaders)。

## [VSCode](https://github.com/microsoft/vscode) {#vscode}
- [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)：在 VS Code 中查看原生 V8 覆盖率

## [Cypress](https://github.com/cypress-io/cypress) {#cypress}
- [cypress-monocart-coverage](https://github.com/cenfun/cypress-monocart-coverage)：Cypress 覆盖率插件

## [WebdriverIO](https://github.com/webdriverio/webdriverio) {#webdriverio}
- [wdio-monocart-service](https://github.com/cenfun/wdio-monocart-service)：WebdriverIO 覆盖率服务

## [Storybook Test Runner](https://github.com/storybookjs/test-runner) {#storybook-test-runner}
- [storybook-monocart-coverage](https://github.com/cenfun/storybook-monocart-coverage)：Storybook V8 覆盖率示例

## [Selenium Webdriver](https://github.com/seleniumhq/selenium) {#selenium-webdriver}
- [selenium-webdriver-coverage](https://github.com/cenfun/selenium-webdriver-coverage)：Selenium WebDriver V8 覆盖率示例

## [CodeceptJS](https://github.com/codeceptjs/CodeceptJS) {#codeceptjs}
- CodeceptJS 从 [v3.5.15](https://github.com/codeceptjs/CodeceptJS/releases/tag/3.5.15) 起集成 MCR，参见[覆盖率插件](https://codecept.io/plugins/#coverage)。

## [TestCafe](https://github.com/DevExpress/testcafe) {#testcafe}
- [testcafe-reporter-coverage](https://github.com/cenfun/testcafe-reporter-coverage)：TestCafe 覆盖率 Reporter

## [c8](https://github.com/bcoe/c8) {#c8}
- c8 从 [v10.1.0](https://github.com/bcoe/c8/releases/tag/v10.1.0) 起以实验功能集成 MCR。
```sh
c8 --experimental-monocart --reporter=v8 --reporter=console-details node foo.js
```

如果使用 Node.js 内置测试运行器，推荐使用 `mcr test` 代替独立的覆盖率采集流程，参见[使用 mcr test 运行测试](/zh/pages/node-test-runner#run-tests-with-mcr-test)。

## [Mocha](https://github.com/mochajs/mocha) {#mocha}
```sh
mcr mocha ./test/**/*.js
```

对于 Node.js 单元测试和集成测试，推荐使用 `mcr test` 代替，参见[使用 mcr test 运行测试](/zh/pages/node-test-runner#run-tests-with-mcr-test)。

## [AVA](https://github.com/avajs/ava) {#ava}
```sh
mcr ava
```

对于 Node.js 单元测试和集成测试，推荐使用 `mcr test` 代替，参见[使用 mcr test 运行测试](/zh/pages/node-test-runner#run-tests-with-mcr-test)。

---

<small>注：使用 `mcr test` 替代测试运行器，是指迁移到 `node:test`，并非只替换命令；原框架的测试 API、断言和钩子可能需要调整。</small>
