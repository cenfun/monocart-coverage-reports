# CDPClient {#collecting-v8-coverage-data-with-cdpclient-api}

`timeout` controls HTTP discovery and WebSocket connection deadlines (default: 10000ms). `requestTimeout` controls each CDP command on built-in WebSocket sessions (default: 30000ms). Set either to `0` to disable its deadline. Custom Playwright/Puppeteer sessions manage their own command timeouts. For custom sockets, use `new MCR.WSSession(ws, { timeout: 30000 })`.

- `CDPClient` available APIs
```ts
interface CoverageClient {
    startJSCoverage: () => Promise<void>;
    stopJSCoverage: () => Promise<V8CoverageEntry[]>;

    startCSSCoverage: () => Promise<void>;
    stopCSSCoverage: () => Promise<V8CoverageEntry[]>;

    /** start both js and css coverage */
    startCoverage: () => Promise<void>;
    /** stop and return both js and css coverage */
    stopCoverage: () => Promise<V8CoverageEntry[]>;

    /** write the coverage started by NODE_V8_COVERAGE to disk on demand, returns v8 coverage dir */
    writeCoverage: () => Promise<string>;

    /** get istanbul coverage data */
    getIstanbulCoverage: (coverageKey?: string) => Promise<any>;
}
```

- Work with node debugger port `--inspect=9229` or browser debugging port `--remote-debugging-port=9229`
```js
import { MCR } from 'monocart-coverage-reports';
const client = await MCR.CDPClient({
    port: 9229
});
await client.startJSCoverage();
// run your test here
const coverageData = await client.stopJSCoverage();
```

- Work with [Playwright CDPSession](https://playwright.dev/docs/api/class-cdpsession)
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

- Work with [Puppeteer CDPSession](https://pptr.dev/api/puppeteer.cdpsession)
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

- Work with [Selenium Webdriver](https://www.selenium.dev/documentation/webdriver/) WebSocket (Chrome/Edge Browser)
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
