# Puppeteer {#collecting-raw-v8-coverage-data-with-puppeteer}

> Depending on your package manager, Puppeteer may not download a browser during installation. If no browser is available, install one manually:
>
> ```sh
> npx puppeteer browsers install chrome
> ```

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
Example: [./test/test-puppeteer.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-puppeteer.js)
