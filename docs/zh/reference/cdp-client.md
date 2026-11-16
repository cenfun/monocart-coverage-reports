# CDPClient {#collecting-v8-coverage-data-with-cdpclient-api}

`timeout` 控制 HTTP 调试目标发现和 WebSocket 连接的超时（默认 10000ms）；`requestTimeout` 控制内置 WebSocket 会话中每条 CDP 命令的超时（默认 30000ms）。设为 `0` 可禁用相应超时。外部 Playwright/Puppeteer 会话自行管理命令超时。自定义 socket 可使用 `new MCR.WSSession(ws, { timeout: 30000 })`。

- `CDPClient`为`MCR`提供的内置接口类，用来更便捷的处理覆盖率相关数据，所有的API如下
```ts
interface CoverageClient {
    // 开始和停止并收集JS的覆盖率数据
    startJSCoverage: () => Promise<void>;
    stopJSCoverage: () => Promise<V8CoverageEntry[]>;

    // 开始和停止并收集CSS的覆盖率数据，支持匿名文件(比如style里的css)
    startCSSCoverage: () => Promise<void>;
    stopCSSCoverage: () => Promise<V8CoverageEntry[]>;

    // 开始和停止并收集JS和CSS的覆盖率数据
    startCoverage: () => Promise<void>;
    stopCoverage: () => Promise<V8CoverageEntry[]>;

    /** 如果开启了NODE_V8_COVERAGE，这个接口用来手动保存当前覆盖率数据 */
    writeCoverage: () => Promise<string>;

    /** 收集istanbul覆盖率数据 */
    getIstanbulCoverage: (coverageKey?: string) => Promise<any>;
}
```

- 结合使用Node调试端口`--inspect=9229` 或者浏览器调试端口 `--remote-debugging-port=9229`
```js
import { MCR } from 'monocart-coverage-reports';
const client = await MCR.CDPClient({
    port: 9229
});
await client.startJSCoverage();
// run your test here
const coverageData = await client.stopJSCoverage();
```

- 结合使用 [Playwright CDPSession](https://playwright.dev/docs/api/class-cdpsession)
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

- 结合使用 [Puppeteer CDPSession](https://pptr.dev/api/puppeteer.cdpsession)
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

- 结合使用 [Selenium Webdriver](https://www.selenium.dev/documentation/webdriver/) WebSocket (仅支持Chrome/Edge浏览器)
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
