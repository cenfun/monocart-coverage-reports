# 采集 Istanbul 覆盖率 {#collecting-istanbul-coverage-data}
- 在收集Istanbul覆盖率数据之前，需要编译源代码来安装Istanbul计数器
    - webpack babel-loader: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul), 参见例子: [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/build/webpack.config-istanbul.js)
    - 官方CLI: [nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md) 或API: [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md)
    - vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul)
    - rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul)
    - swc: [swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument)

- 从浏览器
    - Istanbul的覆盖率数据会保存到全局的`window.__coverage__`，直接读取即可, 参见例子: [test-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js)

- 从Node.js
    - 同理对于Node.js会保存到全局的`global.__coverage__`

- 使用CDP
    - `getIstanbulCoverage()` 参见[`CDPClient` API](/zh/reference/cdp-client#collecting-v8-coverage-data-with-cdpclient-api)
