# Istanbul collection {#collecting-istanbul-coverage-data}

## Step 1: Prepare the build {#build}

Before collecting Istanbul coverage, instrument your source code with Istanbul counters. Choose an integration for your build tool:

- webpack with babel loader: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul); see [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/build/webpack.config-istanbul.js).
- CLI: [nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md), or API: [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md).
- vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul).
- rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul).
- swc: [swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument).

## Step 2: Collect coverage {#collect}

Run your tests against the instrumented code, then retrieve the coverage data using one of the following approaches.

### 1. Browser {#browser}

Read coverage data from `window.__coverage__`; see [test-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js).

### 2. Node.js {#nodejs}

Read coverage data from `global.__coverage__`.

### 3. General-purpose CDP {#cdp}

Use `getIstanbulCoverage()` to retrieve Istanbul coverage through CDP; see [CDPClient](/reference/cdp-client#collecting-v8-coverage-data-with-cdpclient-api).
