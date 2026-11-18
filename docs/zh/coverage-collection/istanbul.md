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

## 第三步：生成报告 {#generate}

这里的 `page` 是已经加载插桩后应用并完成测试操作的页面。创建方式参见 [Playwright](/zh/reference/cdp-client#playwright) 或 [Puppeteer](/zh/reference/cdp-client#puppeteer) 示例中的浏览器与页面初始化部分；Istanbul 采集无需调用这些示例中的原生 V8 / CSS 覆盖率接口。通过下面的代码将页面内的覆盖率对象读取到 Node.js 中：

```js
const coverageData = await page.evaluate(() => window.__coverage__);
if (!coverageData || !Object.keys(coverageData).length) {
    throw new Error('No Istanbul coverage was collected; check instrumentation');
}
```

接上[快速开始中的 API 示例](/zh/getting-started/get-started#api)生成报告，将 `reports` 改为 `['html', 'console-summary']`；其他兼容格式参见 [Istanbul 报告](/zh/reference/reports#istanbul-reports)。

在 Node.js 中，应在执行插桩代码的同一进程内读取 `global.__coverage__`，代替上面的 `page.evaluate()`；在单独的报告脚本中无法直接读取另一个进程的全局变量。
