# 采集 Istanbul 覆盖率 {#istanbul-collection}

## 第一步：构建准备 {#build}

收集 Istanbul 覆盖率之前，需要对源码进行插桩，添加 Istanbul 计数器。根据构建工具选择对应的接入方式：

- webpack babel-loader：[babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul)，参见 [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/build/webpack.config-istanbul.js)。
- 官方 CLI：[nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md)，或 API：[istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md)。
- vite：[vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul)。
- rollup：[rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul)。
- swc：[swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument)。

## 第二步：收集覆盖率 {#collect}

使用插桩后的代码运行测试，再通过以下方式之一读取覆盖率数据。

### 1. 浏览器 {#browser}

从全局的 `window.__coverage__` 读取覆盖率数据，参见 [test-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js)。

### 2. Node.js {#nodejs}

从全局的 `global.__coverage__` 读取覆盖率数据。

### 3. 通用 CDP 方案 {#cdp}

通过 `getIstanbulCoverage()` 读取 Istanbul 覆盖率数据，接入方式参见 [CDPClient](/zh/reference/cdp-client#cdpclient)。
