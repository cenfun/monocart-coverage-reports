# Monocart Coverage Reports

[![](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
[![](https://badgen.net/npm/dw/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)

> Code coverage tool to generate [V8](https://v8.dev/blog/javascript-code-coverage) or [Istanbul](https://istanbul.js.org/) coverage reports.

## Preview Reports
- [V8](https://cenfun.github.io/monocart-coverage-reports/v8)
- [V8 Minify](https://cenfun.github.io/monocart-coverage-reports/v8-minify)
- [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/v8-to-istanbul)
- [Istanbul](https://cenfun.github.io/monocart-coverage-reports/istanbul)
- [Integration with Monocart Reporter](https://cenfun.github.io/monocart-reporter/) - Playwright test report

## Usage
```js
const CoverageReport = require('monocart-coverage-reports');
const options = {
    outputFile: "coverage-reports/2023-11-24/index.html",
    name: "My Coverage Report 2023-11-24"
}
const coverageReport = new CoverageReport(options);
await coverageReport.add(coverageData1);
await coverageReport.add(coverageData2);
const results = await coverageReport.generate();
```

## Options
- [lib/options.js](lib/options.js)

## Compare Istanbul, V8 and V8 to Istanbul
| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| Input data format | Istanbul (Object) | V8 (Array) | V8 (Array) |
| Output | [Istanbul HTML report](https://cenfun.github.io/monocart-coverage-reports/istanbul) | [V8 HTML report](https://cenfun.github.io/monocart-coverage-reports/v8)  | [Istanbul HTML report](https://cenfun.github.io/monocart-coverage-reports/v8-to-istanbul) |
| Indicators | Covered Lines, Branches, Statements and Functions, Execution Counts | Covered Bytes, Lines❔, Execution Counts | Covered Lines, Branches❔, Statements and Functions, Execution Counts |
| Source code without [instrumentation](https://github.com/istanbuljs/babel-plugin-istanbul) | ❌ | ✅ | ✅ |
| CSS coverage | ❌ | ✅ | ✅ |
| Minified code | N/A | ✅ | ❌ |
| Code formatting | N/A | ✅ | ❌ |

❔ - Partial or conditional support

## Links

- [V8 coverage report](https://v8.dev/blog/javascript-code-coverage) - Native support for JavaScript code coverage to V8. (Chromium only)
    - [Puppeteer Coverage Class](https://pptr.dev/api/puppeteer.coverage)
    - [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
    - [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage)
- [Istanbul coverage report](https://istanbul.js.org/) - Instrumenting source codes and generating coverage reports
    - [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul)
    - [istanbul-reports](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib)
    - [Code Coverage Introduction](https://docs.cypress.io/guides/tooling/code-coverage)

