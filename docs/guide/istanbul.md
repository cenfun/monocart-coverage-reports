# Istanbul collection {#collecting-istanbul-coverage-data}
- Before coverage collection: Instrumenting source code with Istanbul
    - webpack with babel loader: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul), see example: [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/build/webpack.config-istanbul.js)
    - CLI: [nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md) or API: [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md)
    - vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul)
    - rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul)
    - swc: [swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument)

- Browser
    - Collecting coverage data from `window.__coverage__`, example: [test-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js)

- Node.js
    - Collecting coverage data from `global.__coverage__`

- CDP
    - `getIstanbulCoverage()` see [`CDPClient` API](/reference/cdp-client#collecting-v8-coverage-data-with-cdpclient-api)
