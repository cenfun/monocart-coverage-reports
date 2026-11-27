# CDPClient {#cdpclient}

`CDPClient` is MCR’s coverage collection client based on the [Chrome DevTools Protocol (CDP)](https://chromedevtools.github.io/devtools-protocol/). It connects to a Node.js process or Chromium-based browser with debugging enabled, or reuses an existing Playwright/Puppeteer CDP session, to start and stop JavaScript coverage collection and, in browsers, CSS coverage collection. Pass the collected data to `mcr.add()` and then call `mcr.generate()` to generate reports; `CDPClient` handles collection, not report generation.

## Timeouts {#timeouts}

`timeout` controls HTTP discovery and WebSocket connection deadlines (default: 10000ms). `requestTimeout` controls each CDP command on built-in WebSocket sessions (default: 30000ms). Set either to `0` to disable its deadline. Custom Playwright/Puppeteer sessions manage their own command timeouts. For custom sockets, use [`new MCR.WSSession(ws, { timeout: 30000 })`](/pages/types#wssession).

## API types {#api-types}

[`CDPClient`](/pages/types#cdpclient) accepts [`CDPOptions`](/pages/types#cdpoptions) and resolves to a [`CoverageClient`](/pages/types#coverageclient) or `undefined`. Custom sessions implement [`CDPSession`](/pages/types#cdpsession); `stopJSCoverage()`, `stopCSSCoverage()` and `stopCoverage()` return arrays of [`V8CoverageEntry`](/pages/types#v8coverageentry).

All examples require a working connection. If `CDPClient()` returns `undefined`, check the debugging port or session and stop the collection flow rather than calling client methods. Browser examples also require the automation package and a browser; replace `your page url` with your page URL, and run and await test actions after navigation and before stopping coverage.

## Debugging ports {#debugging-ports}

Use the Node.js debugger port `--inspect=9229` or browser debugging port `--remote-debugging-port=9229`.

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

Use a [Playwright CDPSession](https://playwright.dev/docs/api/class-cdpsession).

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

Use a [Puppeteer CDPSession](https://pptr.dev/api/puppeteer.cdpsession).

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

## Generate a report {#generate}

Pass `coverageData` above to the [quick-start API example](/pages/get-started#api) to generate reports without further conversion.

Call `await client.close()` after collection to close the CDP connection, and close any browser you created. In real tests, use `try/finally` to clean up even on failure.

## Selenium WebDriver {#selenium-webdriver}

Use a [Selenium WebDriver](https://www.selenium.dev/documentation/webdriver/) WebSocket (Chrome/Edge).

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
