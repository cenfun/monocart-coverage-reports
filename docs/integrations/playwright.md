# Playwright {#collecting-v8-coverage-data-with-playwright}
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
For Playwright Test automatic fixtures, see [fixtures.js](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.js) in the complete [playwright-coverage example](https://github.com/cenfun/playwright-coverage). The [best-practices guide](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/references/best-practices.md#complete-project-example) explains the integration.
For more examples, see [./test/test-v8.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-v8.js), [css](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-css.js)
