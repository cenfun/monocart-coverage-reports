# Puppeteer {#collecting-raw-v8-coverage-data-with-puppeteer}

> 取决于包管理器配置，Puppeteer 可能不会在安装依赖时下载浏览器。如果没有可用浏览器，请手动安装：
>
> ```sh
> npx puppeteer browsers install chrome
> ```

使用Puppeteer的覆盖接口收集覆盖率数据，注意Puppeteer默认不会提供原生V8的覆盖率数据，需要设置`includeRawScriptCoverage`
```js
await Promise.all([
    page.coverage.startJSCoverage({
        // reportAnonymousScripts: true,
        resetOnNavigation: false,
        // provide raw v8 coverage data
        includeRawScriptCoverage: true
    }),
    page.coverage.startCSSCoverage({
        resetOnNavigation: false
    })
]);

await page.goto('your page url');

const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
]);

// to raw V8 script coverage
const coverageData = [... jsCoverage.map((it) => {
    return {
        source: it.text,
        ... it.rawScriptCoverage
    };
}), ... cssCoverage];
```
参见: [./test/test-puppeteer.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-puppeteer.js)
