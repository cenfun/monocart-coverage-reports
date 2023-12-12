# Monocart Coverage Reports

[![](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
[![](https://badgen.net/npm/dw/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)

> Code coverage tool to generate [V8](https://v8.dev/blog/javascript-code-coverage) or [Istanbul](https://istanbul.js.org/) coverage reports.

## Preview Reports
- [V8](https://cenfun.github.io/monocart-coverage-reports/v8)
- [V8 Minify](https://cenfun.github.io/monocart-coverage-reports/v8-minify)
- [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/istanbul)
- [Istanbul](https://cenfun.github.io/monocart-coverage-reports/istanbul/)
- [Integration with Monocart Reporter](https://cenfun.github.io/monocart-reporter/) - Playwright test report

## Usage
```js
const CoverageReport = require('monocart-coverage-reports');
const options = {
    outputDir: './coverage-reports',
    reports: "v8"
}
const coverageReport = new CoverageReport(options);
await coverageReport.add(coverageData1);
await coverageReport.add(coverageData2);
const coverageResults = await coverageReport.generate();
console.log(coverageResults.summary);
```
- [example v8](https://github.com/cenfun/monocart-coverage-reports/blob/main/tests/test-v8.js)
- [example istanbul](https://github.com/cenfun/monocart-coverage-reports/blob/main/tests/test-istanbul.js)

## Default Options
- [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)

## Multiple Reports
- v8 report
    - v8
    - v8-json
- [istanbul reports](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib)
    - clover
    - cobertura
    - html
    - html-spa
    - json
    - json-summary
    - lcov
    - lcovonly
    - none
    - teamcity
    - text
    - text-lcov
    - text-summary

```js
const CoverageReport = require('monocart-coverage-reports');
const options = {
    outputDir: './coverage-reports',
    reports: [
        ['v8'],
        ['html', {
            subdir: 'istanbul'
        }],
        ['json', {
            file: 'my-json-file.json'
        }],
        'lcovonly'
    ]
}
const coverageReport = new CoverageReport(options);
```

# Multiprocessing Support
The data will be added to `[outputDir]/.cache`, and the cache will be removed after reports generated.
- sub process 1
```js
const CoverageReport = require('monocart-coverage-reports');
const options = require('path-to/same-options.js');
const coverageReport = new CoverageReport(options);
await coverageReport.add(coverageData1);
```

- sub process 2
```js
const CoverageReport = require('monocart-coverage-reports');
const options = require('path-to/same-options.js');
const coverageReport = new CoverageReport(options);
await coverageReport.add(coverageData2);
```

- main process
```js
// after all sub processes finished
const CoverageReport = require('monocart-coverage-reports');
const options = require('path-to/same-options.js');
const coverageReport = new CoverageReport(options);
const coverageResults = await coverageReport.generate();
console.log(coverageResults.summary);
```

## Compare Reports
| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| Input | Istanbul (Object) | V8 (Array) | V8 (Array) |
| Output | [Istanbul HTML report](https://cenfun.github.io/monocart-coverage-reports/istanbul) | [V8 HTML report](https://cenfun.github.io/monocart-coverage-reports/v8)  | [Istanbul HTML report](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/istanbul) |
| Indicators | Covered Lines, Branches, Statements and Functions, Execution Counts | Covered Bytes, Lines❔, Execution Counts | Covered Lines, Branches❔, Statements and Functions❔, Execution Counts |
| CSS coverage | ❌ | ✅ | ✅ |
| Minified code | N/A | ✅ | ❌ |
| Code formatting | N/A | ✅ | ❌ |

❔ - Partial or conditional support

## Compare Workflows
- Istanbul Workflows
    - 1, Only for source code: instrumenting code with [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul)，see [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/mock/webpack.config-istanbul.js), or using [nyc](https://github.com/istanbuljs/nyc).
    - 2, Collecting coverage data from browser `window.__coverage__`, see [example](https://github.com/cenfun/monocart-coverage-reports/blob/main/tests/test-istanbul.js).
    - 3, Generating coverage report.

- V8 Workflows
    - 1, For any runtime code: nothing to do. For source code: building code with `development` [mode](https://webpack.js.org/configuration/mode/) and [sourcemap](https://webpack.js.org/configuration/devtool/) support, see [webpack.config-v8.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/mock/webpack.config-v8.js).
    - 2, Collecting coverage data with [Chromium Coverage API](#chromium-coverage-api), see [example](https://github.com/cenfun/monocart-coverage-reports/blob/main/tests/test-v8.js).
    - 3, Generating coverage report.

## Chromium Coverage API
- [V8 coverage report](https://v8.dev/blog/javascript-code-coverage) - Native support for JavaScript code coverage to V8. (Chromium only)
- [Puppeteer Coverage Class](https://pptr.dev/api/puppeteer.coverage)
- [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
- [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage)


## Istanbul Coverage
- [Istanbul coverage report](https://istanbul.js.org/) - Instrumenting source codes and generating coverage reports
- [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul)
- [istanbul-reports](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib)
- [Code Coverage Introduction](https://docs.cypress.io/guides/tooling/code-coverage)

## Thanks
- Special thanks to [@edumserrano](https://github.com/edumserrano)