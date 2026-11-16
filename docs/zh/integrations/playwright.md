# Playwright {#collecting-v8-coverage-data-with-playwright}
使用Playwright的覆盖接口收集覆盖率数据
```js
await Promise.all([
    page.coverage.startJSCoverage({
        // reportAnonymousScripts: true,
        resetOnNavigation: false
    }),
    page.coverage.startCSSCoverage({
        // Note, anonymous styles (without sourceURLs) are not supported, alternatively, you can use CDPClient
        resetOnNavigation: false
    })
]);

await page.goto('your page url');

const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
]);

const coverageData = [... jsCoverage, ... cssCoverage];

```
Playwright Test 自动 fixture 参见完整 [playwright-coverage 示例](https://github.com/cenfun/playwright-coverage)中的 [fixtures.js](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.js)，接入方式见[最佳实践指南](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/references/best-practices.md#complete-project-example)。
参见例子 [./test/test-v8.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-v8.js), [css](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-css.js)
