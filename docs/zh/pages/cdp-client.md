# CDPClient {#cdpclient}

`CDPClient` 是 MCR 基于 [Chrome DevTools Protocol（CDP）](https://chromedevtools.github.io/devtools-protocol/) 提供的覆盖率采集客户端。它可以连接已开启调试功能的 Node.js 进程或 Chromium 内核浏览器，也可以复用 Playwright/Puppeteer 已有的 CDP 会话，用于开启、停止并获取 JavaScript 覆盖率，以及浏览器中的 CSS 覆盖率。采集到的数据交给 `mcr.add()`，再调用 `mcr.generate()` 生成报告；`CDPClient` 负责采集，不直接生成报告。

## 超时设置 {#timeouts}

`timeout` 控制 HTTP 调试目标发现和 WebSocket 连接的超时（默认 10000ms）；`requestTimeout` 控制内置 WebSocket 会话中每条 CDP 命令的超时（默认 30000ms）。设为 `0` 可禁用相应超时。外部 Playwright/Puppeteer 会话自行管理命令超时。自定义 socket 可使用 [`new MCR.WSSession(ws, { timeout: 30000 })`](/zh/pages/types#wssession)。

## API 类型 {#api-types}

[`CDPClient`](/zh/pages/types#cdpclient) 接收 [`CDPOptions`](/zh/pages/types#cdpoptions)，异步返回 [`CoverageClient`](/zh/pages/types#coverageclient) 或 `undefined`。自定义会话需实现 [`CDPSession`](/zh/pages/types#cdpsession)；`stopJSCoverage()`、`stopCSSCoverage()` 和 `stopCoverage()` 返回 [`V8CoverageEntry`](/zh/pages/types#v8coverageentry) 数组。

所有示例都需要先建立有效连接。如果 `CDPClient()` 返回 `undefined`，请检查调试端口或会话并终止当前采集流程，不要继续调用客户端方法。浏览器示例还需要安装对应自动化工具及浏览器，将 `your page url` 替换为被测页面地址，并在导航后、停止采集前执行和等待测试操作。

## 调试端口 {#debugging-ports}

使用 Node.js 调试端口 `--inspect=9229` 或浏览器调试端口 `--remote-debugging-port=9229`。

```js
import { MCR } from 'monocart-coverage-reports';
const client = await MCR.CDPClient({
    port: 9229
});
await client.startJSCoverage();
// run your test here
const coverageData = await client.stopJSCoverage();
```

## Playwright {#playwright}

结合使用 [Playwright CDPSession](https://playwright.dev/docs/api/class-cdpsession)。

```js
import { chromium } from 'playwright';
import { MCR } from 'monocart-coverage-reports';
const browser = await chromium.launch();
const page = await browser.newPage();
const session = await page.context().newCDPSession(page);
const client = await MCR.CDPClient({
    session
});
// both js and css coverage
await client.startCoverage();
// run your test page here
await page.goto('your page url');
const coverageData = await client.stopCoverage();
```

## Puppeteer {#puppeteer}

结合使用 [Puppeteer CDPSession](https://pptr.dev/api/puppeteer.cdpsession)。

```js
import puppeteer from 'puppeteer';
import { MCR } from 'monocart-coverage-reports';
const browser = await puppeteer.launch({});
const page = await browser.newPage();
const session = await page.target().createCDPSession();
const client = await MCR.CDPClient({
    session
});
// both js and css coverage
await client.startCoverage();
// run your test page here
await page.goto('your page url');
const coverageData = await client.stopCoverage();
```

## 生成报告 {#generate}

将上述 `coverageData` 传给[快速开始中的 API 示例](/zh/pages/get-started#api)，即可生成报告，无需额外转换。

采集后调用 `await client.close()` 关闭 CDP 连接；浏览器示例中还需要关闭自己创建的 browser。实际测试建议使用 `try/finally` 确保失败时也能清理。

## Selenium WebDriver {#selenium-webdriver}

结合使用 [Selenium WebDriver](https://www.selenium.dev/documentation/webdriver/) WebSocket（仅支持 Chrome/Edge 浏览器）。

```js
import { Builder, Browser } from 'selenium-webdriver';
import { MCR } from 'monocart-coverage-reports';
const driver = await new Builder().forBrowser(Browser.CHROME).build();
const pageCdpConnection = await driver.createCDPConnection('page');
const session = new MCR.WSSession(pageCdpConnection._wsConnection);
const client = await MCR.CDPClient({
    session
});
```
