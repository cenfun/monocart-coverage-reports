# Monocart Coverage Reports

[![](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
[![](https://badgen.net/npm/dw/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)

> Code coverage tool to generate [V8](https://v8.dev/blog/javascript-code-coverage) or [Istanbul](https://istanbul.js.org/) coverage reports.

## Preview Reports
- [V8](https://cenfun.github.io/monocart-coverage-reports/v8)
- [V8 Esbuild](https://cenfun.github.io/monocart-coverage-reports/v8-esbuild)
- [V8 Rollup](https://cenfun.github.io/monocart-coverage-reports/v8-rollup)
- [V8 lcov.info](https://cenfun.github.io/monocart-coverage-reports/v8/lcov.info)
- [V8 Node env](https://cenfun.github.io/monocart-coverage-reports/v8-node-env)
- [V8 Node Inspector](https://cenfun.github.io/monocart-coverage-reports/v8-node-ins)
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
- [example v8](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-v8.js)
- [example istanbul](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js)

## Default Options
- [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)

## Multiple Reports
### V8 reports
- v8 (html)
- v8-json
### [Istanbul reports](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib)
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

## Multiprocessing Support
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
| Instrumenting code | Required | No | No |
| Coverage data | Istanbul (Object) | V8 (Array) | V8 (Array) |
| Output | [Istanbul reports](#istanbul-reports) | [V8 reports](#v8-reports)  | [Istanbul reports](#istanbul-reports) |
| - Bytes | ❌ | ✅ | ❌ |
| - Statements | ✅ | ❌ | ☑️❔ |
| - Branches | ✅ | ☑️❔ | ☑️❔ |
| - Functions | ✅ | ✅ | ✅ |
| - Lines | ✅ | ✅ | ✅ |
| - Execution counts | ✅ | ✅ | ✅ |
| CSS coverage | ❌ | ✅ | ✅ |
| Minified code | ❌ | ✅ | ❌ |

❔ - Partial or conditional support

## Compare Workflows
- Istanbul Workflows
    - 1, Only for source code: instrumenting code with [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul)，see [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/webpack.config-istanbul.js), or using [nyc](https://github.com/istanbuljs/nyc).
    - 2, Collecting coverage data from browser `window.__coverage__` or from node `global.__coverage__`, see [example](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js).
    - 3, Generating coverage report.

- V8 Workflows
    - 1, For any runtime code: nothing to do. For source code: building code with `development` [mode](https://webpack.js.org/configuration/mode/) and [sourcemap](https://webpack.js.org/configuration/devtool/) support, see [webpack.config-v8.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/webpack.config-v8.js).
    - 2, Collecting coverage data with [Chromium Coverage API](#chromium-coverage-api), see [example](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-v8.js).
    - 3, Generating coverage report.

## Chromium Coverage API
- [V8 coverage report](https://v8.dev/blog/javascript-code-coverage) - Native support for JavaScript code coverage to V8. (Chromium only)
- [Puppeteer Coverage Class](https://pptr.dev/api/puppeteer.coverage)
- [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
- [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage)


## Node.js V8 Coverage Report for Server Side
There are two ways to collect native V8 coverage data and generate coverage report:
- Using Node.js env [NODE_V8_COVERAGE](https://nodejs.org/docs/latest/api/cli.html#node_v8_coveragedir)=`dir`
    - 1, Before running your Node.js application, set env `NODE_V8_COVERAGE`=`dir`. After the application runs and exits, the coverage data will be saved to the `dir` directory in JSON file format.
    - 2, Read the json file(s) from the `dir` and generate coverage report. see example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage` node [./test/test-node-env.js](./test/test-node-env.js) && node [./test/generate-node-report.js](./test/generate-node-report.js)
    
- Using [Inspector](https://nodejs.org/docs/latest/api/inspector.html) API
   - 1, Connecting to the V8 inspector and enable V8 coverage.
   ```js
    const inspector = require('inspector');
    const startV8Coverage = async () => {
        const session = new inspector.Session();
        session.connect();
        await session.post('Profiler.enable');
        await session.post('Profiler.startPreciseCoverage', {
            callCount: true,
            detailed: true
        });
        return session;
    };
   ```
   - 2, Taking coverage data and adding to the report after your application runs.
   ```js
    const takeV8Coverage = (session) => {
        return new Promise((resolve) => {
            session.post('Profiler.takePreciseCoverage', (error, coverage) => {
                if (error) {
                    console.log(error);
                    resolve();
                    return;
                }
                resolve(coverage.result);
            });
        });
    };
    const coverageList = await takeV8Coverage(session);
    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && !entry.url.startsWith('node:'));
    await new CoverageReport(coverageOptions).add(coverageList);
   ```
   - 3, Generating coverage report. see example: [./test/test-node-ins.js](./test/test-node-ins.js)
   ```js
    await new CoverageReport(coverageOptions).generate();
   ```

## Using `entryFilter` and `sourceFilter` to filter the results for V8 report
When you add coverage data with [Chromium Coverage API](#chromium-coverage-api), it actually contains the data of all entry files, for example:
```
1, dist/main.js
2, dist/vendor.js
3, dist/something-else.js
```
We can use `entryFilter` to filter the entry files. For example, we should remove `vendor.js` and `something-else.js` if they are not in our coverage scope. 
```
1, dist/main.js
```
When inline or linked sourcemap exists to the entry file, the source files will be extracted from the sourcemap for the entry file, and the entry file will be removed if `logging` is not `debug`.
```
1, src/index.js
2, src/components/app.js
3, node_modules/dependency/dist/dependency.js
```
We can use `sourceFilter` to filter the source files. For example, we should remove `dependency.js` if it is not in our coverage scope.
```
1, src/index.js
2, src/components/app.js
```
Example:
```js
const coverageOptions = {
    entryFilter: (entry) => entry.url.indexOf("main.js") !== -1,
    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1
};
```

## Istanbul Coverage
- [Istanbul coverage report](https://istanbul.js.org/) - Instrumenting source codes and generating coverage reports
- [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul)
- [istanbul-reports](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib)
- [Code Coverage Introduction](https://docs.cypress.io/guides/tooling/code-coverage)


## Thanks
- Special thanks to [@edumserrano](https://github.com/edumserrano)