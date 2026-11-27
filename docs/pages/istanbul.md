# Istanbul collection {#istanbul-collection}

## Step 1: Prepare the build {#build}

Before collecting Istanbul coverage, instrument your source code with Istanbul counters. Choose an integration for your build tool:

- webpack with babel loader: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul); see [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/build/webpack.config-istanbul.js).
- CLI: [nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md), or API: [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md).
- vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul).
- rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul).
- swc: [swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument).

## Step 2: Collect coverage {#collect}

Run your tests against the instrumented code, then retrieve the coverage data using one of the following approaches.

### 1. Node.js {#nodejs}

Read coverage data from `global.__coverage__`.

### 2. Browser {#browser}

Read coverage data from `window.__coverage__`; see [test-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js).

### 3. General-purpose CDP {#cdp}

Use `getIstanbulCoverage()` to retrieve Istanbul coverage through CDP; see [CDPClient](/pages/cdp-client#cdpclient).

## Step 3: Generate a report {#generate}

Here, `page` is an existing page that has loaded your instrumented application and completed the test actions. For browser and page initialization, see the [Playwright](/pages/cdp-client#playwright) or [Puppeteer](/pages/cdp-client#puppeteer) examples; Istanbul collection does not require the native V8 / CSS coverage calls in those examples. Retrieve the page's coverage object into Node.js:

```js
const coverageData = await page.evaluate(() => window.__coverage__);
if (!coverageData || !Object.keys(coverageData).length) {
    throw new Error('No Istanbul coverage was collected; check instrumentation');
}
```

Continue with the [quick-start API example](/pages/get-started#api), changing `reports` to `['html', 'console-summary']`. See [Istanbul reports](/pages/reports#istanbul-reports) for other compatible formats.

In Node.js, replace `page.evaluate()` with `global.__coverage__` in the same process that executes the instrumented code; a separate report script cannot directly read another process's globals.
