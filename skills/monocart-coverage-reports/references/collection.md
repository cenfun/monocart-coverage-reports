# Coverage collection recipes

Examples use ESM (`.mjs`, or `.js` under `"type": "module"`) and the MCR 3.x runtime contract. Reuse installed browser/test tools; do not install every collector. MCR itself is a Node-side library, not a browser import.

## Choose the input

| Runtime / existing data | Collection path | MCR input |
| --- | --- | --- |
| Node program or test command | `mcr <executable> <args>` | CLI collects and generates |
| Node raw V8 directory | `NODE_V8_COVERAGE` before process start | `addFromDir(dir)` or `dataDir` |
| Playwright Chromium | `page.coverage` | JS + CSS entry array |
| Puppeteer | Raw script coverage + source text | Converted JS + CSS entry array |
| Chromium/Node inspector | `CDPClient` | `stopCoverage()` / `stopJSCoverage()` result |
| Already Istanbul-instrumented program | `window.__coverage__` / `globalThis.__coverage__` | Istanbul map object |

Do not assume Chromium V8 coverage works in Firefox/WebKit or that it automatically covers every browser context, page, worker, or remote backend. Explicitly collect the runtimes/targets the task requires.

## Playwright Chromium: complete standalone script

Assumes the application's test server is already running at `APP_URL` (or the local default). Prefer the host's existing server lifecycle and readiness checks.

```js
// collect-browser.mjs
import { chromium } from 'playwright';
import { MCR } from 'monocart-coverage-reports';

const report = MCR({
    outputDir: './coverage-reports/browser',
    reports: ['v8', 'console-summary'],
    cleanCache: true
});
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    await Promise.all([
        page.coverage.startJSCoverage({ resetOnNavigation: false }),
        page.coverage.startCSSCoverage({ resetOnNavigation: false })
    ]);
    await page.goto(process.env.APP_URL || 'http://localhost:3000');
    // Perform real assertions/interactions here before stopping coverage.
    const [js, css] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);
    await report.add([...js, ...css]);
    const results = await report.generate();
    if (!results) throw new Error('No browser coverage generated');
} finally {
    await browser.close();
}
```

For test suites, start/stop in the host runner's fixtures/hooks, persist each test's data, and generate **once after all workers finish**. Do not create a `cleanCache: true` report per test against a shared directory. Collect before teardown/navigation destroys the execution target. On failure, retain coverage where possible without replacing the original test failure with a successful exit.

Anonymous scripts require deliberate URL/source handling; Playwright CSS coverage does not support anonymous styles without source URLs. Use CDP when that limitation matters.

## Puppeteer: convert the JS data shape

Within an existing Puppeteer `page` lifecycle:

```js
await Promise.all([
    page.coverage.startJSCoverage({
        resetOnNavigation: false,
        includeRawScriptCoverage: true
    }),
    page.coverage.startCSSCoverage({ resetOnNavigation: false })
]);
await page.goto(appUrl); // appUrl is the host application's test URL
// Exercise and assert the application here.
const [js, css] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
]);
const entries = [
    ...js.map((entry) => ({
        ...entry.rawScriptCoverage,
        source: entry.text
    })),
    ...css
];
await report.add(entries); // report is an MCR instance; generate after collection
```

Do not pass Puppeteer's simplified JS coverage directly as raw V8 function coverage. Preserve `rawScriptCoverage.functions` and the exact matching source text. Close the browser in `finally` after coverage collection.

## CDPClient

For Playwright use `await page.context().newCDPSession(page)`; for Puppeteer use `await page.target().createCDPSession()`. Pass the resulting session to MCR:

```js
import { CDPClient } from 'monocart-coverage-reports';

const client = await CDPClient({ session });
if (!client) throw new Error('Cannot connect coverage client');
try {
    await client.startCoverage(); // both JS and CSS on a browser target
    // Navigate/exercise the target here.
    const entries = await client.stopCoverage();
    await report.add(entries);
} finally {
    await client.close();
}
```

For a Node debugger target, connect with `{ port: 9229 }` (start the program with `--inspect=9229`) and use `startJSCoverage()` / `stopJSCoverage()`, not CSS methods. Ensure the target remains alive during collection; restrict debugger exposure to trusted/local interfaces.

In 3.x, `timeout` controls discovery/connection (default 10000 ms), and `requestTimeout` controls built-in WebSocket commands (default 30000 ms). `0` disables the respective deadline. External Playwright/Puppeteer sessions manage their own command deadlines. Handle disconnects/rejected commands rather than waiting indefinitely.

## Node raw directory

The easiest path is the CLI because it also registers source capture. For manual collection, set the environment **before** starting the program. Use a fresh directory per independent run. POSIX shell example:

```sh
NODE_V8_COVERAGE=./coverage-data node --import monocart-coverage-reports/register ./app.js
node ./generate-coverage.mjs
```

In Windows PowerShell, set `$env:NODE_V8_COVERAGE='./coverage-data'` before `node`; remove it afterward with `Remove-Item Env:NODE_V8_COVERAGE`. Or use the host's existing cross-platform environment tooling. Do not add a dependency solely for this example.

```js
// generate-coverage.mjs
import { MCR } from 'monocart-coverage-reports';
const report = MCR({
    outputDir: './coverage-reports/node',
    reports: ['v8', 'lcovonly', 'console-summary'],
    cleanCache: true
});
await report.addFromDir('./coverage-data');
const results = await report.generate();
if (!results) throw new Error('No Node coverage generated');
```

Wait for the target/children to finish flushing. Long-lived servers can use `node:v8`'s `takeCoverage()` with `NODE_V8_COVERAGE`, or MCR's `client.writeCoverage()` through a debugger connection. Flushing still requires coordinated shutdown; do not kill the process before writing inputs.

A Node coverage JSON file contains a `result` array and may have sourcemap metadata. Prefer `addFromDir()` over manually discarding that metadata. Inspector collection requires fetching/attaching the actual script source. Do not create fake source strings for real application scripts.

## Istanbul input

Instrument the tested build with the host's existing Istanbul plugin/tool first. Then collect before the page closes:

```js
const data = await page.evaluate(() => globalThis.__coverage__);
if (!data || !Object.keys(data).length) {
    throw new Error('Missing Istanbul coverage: verify instrumentation');
}
await report.add(data);
```

For Node, read `globalThis.__coverage__` in the instrumented process. Use `reports: ['html', 'lcovonly', 'console-summary']` for Istanbul input; native V8 byte/CSS reports cannot be reconstructed from an Istanbul map. MCR does not apply its V8 input filters to Istanbul maps; configure instrumentation/runner scope appropriately.

Existing Jest/Vitest coverage should use their compatible MCR integration or raw export path. Do not assume a reporter for one framework can be installed as another framework's reporter, or that an arbitrary JSON report is an MCR raw export.
