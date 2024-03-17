# Monocart Coverage Reports

[![](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
[![](https://badgen.net/npm/dw/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![](https://img.shields.io/librariesio/github/cenfun/monocart-coverage-reports)
![](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)
![](https://img.shields.io/github/actions/workflow/status/cenfun/monocart-coverage-reports/static.yml)

> A code coverage tool to generate native [V8](https://v8.dev/blog/javascript-code-coverage) reports or [Istanbul](https://istanbul.js.org/) reports.

* [Usage](#usage)
* [Default Options](#default-options)
* [Available Reports](#available-reports)
* [Using `entryFilter` and `sourceFilter` to filter the results for V8 report](#using-entryfilter-and-sourcefilter-to-filter-the-results-for-v8-report)
* [onEnd Hook](#onend-hook)
* [Command Line](#command-line)
* [Compare Reports](#compare-reports)
* [Compare Workflows](#compare-workflows)
* [Collecting Istanbul Coverage Data](#collecting-istanbul-coverage-data)
* [Collecting V8 Coverage Data](#collecting-v8-coverage-data)
* [Manually Resolve the Sourcemap](#manually-resolve-the-sourcemap)
* [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)
* [Node.js V8 Coverage Report for Server Side](#nodejs-v8-coverage-report-for-server-side)
* [Collecting V8 Coverage Data with `CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)
* [Multiprocessing Support](#multiprocessing-support)
* [Merge Coverage Reports](#merge-coverage-reports)
* [Resolve `sourcePath` for the Source Files](#resolve-sourcepath-for-the-source-files)
* [Adding Empty Coverage for Untested Files](#adding-empty-coverage-for-untested-files)
* [Ignoring Uncovered Codes](#ignoring-uncovered-codes)
* [Chromium Coverage API](#chromium-coverage-api)
* [V8 Coverage Data Format](#v8-coverage-data-format)
* [How to convert V8 to Istanbul](#how-to-convert-v8-to-istanbul)
    - [Using `v8-to-istanbul`](#using-v8-to-istanbul)
    - [How Monocart Works](#how-monocart-works)
* [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
* [Common issues](#common-issues)
* [Integration](#integration)
    - [Playwright](#playwright)
    - [Jest](#jest)
    - [Vitest](#vitest)
    - [Cypress](#cypress)
    - [CodeceptJS](#codeceptjs)
    - [WebdriverIO](#webdriverio)
    - [Storybook Test Runner](#storybook-test-runner)
    - [TestCafe](#testcafe)
    - [Codecov](#codecov)
    - [Coveralls](#coveralls)
    - [Sonar Cloud](#sonar-cloud)
    - [Integration with Any Testing Framework](#integration-with-any-testing-framework)
* [Thanks](#thanks)

## Usage
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = {
    name: 'My Coverage Report - 2024-02-28',
    outputDir: './coverage-reports',
    reports: ["v8", "console-details"]
}
const coverageReport = MCR(coverageOptions);
coverageReport.cleanCache();

await coverageReport.add(coverageData1);
await coverageReport.add(coverageData2);

await coverageReport.generate();

// Or 
// const { CoverageReport } = require('monocart-coverage-reports');
// const coverageReport = new CoverageReport(coverageOptions);
```
- [example v8](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-v8.js)
- [example istanbul](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js)

## Default Options
- [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
    - `reports` [Available Reports](#available-reports)
    - `entryFilter` and `sourceFilter` [Using `entryFilter` and `sourceFilter` to filter the results for V8 report](#using-entryfilter-and-sourcefilter-to-filter-the-results-for-v8-report)
    - `sourcePath` [Resolve `sourcePath` for the Source Files](#resolve-sourcepath-for-the-source-files)
    - `all` [Adding Empty Coverage for Untested Files](#adding-empty-coverage-for-untested-files)
    - `inputDir` [Merge Coverage Reports](#merge-coverage-reports)
    - `logging` [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
    - `onEnd` [onEnd Hook](#onend-hook)

- Declaration [lib/index.d.ts](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/index.d.ts)

## Available Reports

> V8 build-in reports (V8 data only):

- `v8`
    - Features: 
        - A Brand-New V8 Coverage Report User Interface
        - Support for Native Byte Statistics
        - Coverage for Any Runtime Code
        - CSS Coverage Support
        - Better Support for Sourcemap Conversion
    - Demos:
        - Browser: Build with webpack [V8](https://cenfun.github.io/monocart-coverage-reports/v8) and [Minify](https://cenfun.github.io/monocart-coverage-reports/minify); Build with [Rollup](https://cenfun.github.io/monocart-coverage-reports/rollup) and [Esbuild](https://cenfun.github.io/monocart-coverage-reports/esbuild); Collect with [puppeteer](https://cenfun.github.io/monocart-coverage-reports/puppeteer/); [anonymous](https://cenfun.github.io/monocart-coverage-reports/anonymous/) and [css](https://cenfun.github.io/monocart-coverage-reports/css/)
        - Node.js: Collect with [env](https://cenfun.github.io/monocart-coverage-reports/node-env), and also V8 [API](https://cenfun.github.io/monocart-coverage-reports/node-api), [Inspector](https://cenfun.github.io/monocart-coverage-reports/node-ins) and [CDP](https://cenfun.github.io/monocart-coverage-reports/node-cdp); Web server example: [koa](https://cenfun.github.io/monocart-coverage-reports/node-koa/)

![](./assets/v8.gif)

- `v8-json`
    - [V8 coverage-report.json](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/coverage-report.json)

> Istanbul build-in reports (both V8 and istanbul data):

- `clover`
- `cobertura`
- `html`
    - [Istanbul html](https://cenfun.github.io/monocart-coverage-reports/istanbul/) 
    - [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/istanbul)
- `html-spa`
    - [Istanbul html-spa](https://cenfun.github.io/monocart-coverage-reports/istanbul/html-spa/)
- `json`
- `json-summary`
- `lcov`
- `lcovonly`
    - [V8 lcov.info](https://cenfun.github.io/monocart-coverage-reports/v8/lcov.info)
    - [Istanbul lcov.info](https://cenfun.github.io/monocart-coverage-reports/istanbul/lcov.info)
- `none`
- `teamcity`
- `text`
- `text-lcov`
- `text-summary`

> Other build-in reports (both V8 and istanbul data):

- `codecov`
    - coverage data for [Codecov](https://docs.codecov.com/docs/codecov-custom-coverage-format), see [example](https://app.codecov.io/github/cenfun/monocart-coverage-reports) 

- `console-summary` shows coverage summary in the console

![](./assets/console-summary.png)

- `console-details` Show file coverage and uncovered lines in the console. Like `text`, but for V8. For Github actions, we can enforce color with env: `FORCE_COLOR: true`.

![](./assets/console-details.png)

- `raw` only keep all original data, which can be used for other reports input with `inputDir`
    - see [Merge Coverage Reports](#merge-coverage-reports)

- Custom Reporter
    ```js
    {
        reports: [
            [path.resolve('./test/custom-istanbul-reporter.js'), {
                type: 'istanbul',
                file: 'custom-istanbul-coverage.text'
            }],
            [path.resolve('./test/custom-v8-reporter.js'), {
                type: 'v8',
                outputFile: 'custom-v8-coverage.json'
            }],
            [path.resolve('./test/custom-v8-reporter.mjs'), {
                type: 'both'
            }]
        ]
    }
    ```
    - istanbul custom reporter
    > example: [./test/custom-istanbul-reporter.js](./test/custom-istanbul-reporter.js), see [istanbul built-in reporters' implementation](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) for reference.
    - v8 custom reporter
    > example: [./test/custom-v8-reporter.js](./test/custom-v8-reporter.js)

### Multiple Reports:
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        // build-in reports
        ['console-summary'],
        ['v8'],
        ['html', {
            subdir: 'istanbul'
        }],
        ['json', {
            file: 'my-json-file.json'
        }],
        'lcovonly',

        // custom reports
        // Specify reporter name with the NPM package
        ["custom-reporter-1"],
        ["custom-reporter-2", {
            type: "istanbul",
            key: "value"
        }],
        // Specify reporter name with local path
        ['/absolute/path/to/custom-reporter.js']

    ]
}
const coverageReport = MCR(coverageOptions);
coverageReport.cleanCache();
```

## Using `entryFilter` and `sourceFilter` to filter the results for V8 report
When V8 coverage data collected, it actually contains the data of all entry files, for example:
```
dist/main.js
dist/vendor.js
dist/something-else.js
```
We can use `entryFilter` to filter the entry files. For example, we should remove `vendor.js` and `something-else.js` if they are not in our coverage scope. 
```
dist/main.js
```
When inline or linked sourcemap exists to the entry file, the source files will be extracted from the sourcemap for the entry file, and the entry file will be removed if `logging` is not `debug`.
```
> src/index.js
> src/components/app.js
> node_modules/dependency/dist/dependency.js
```
We can use `sourceFilter` to filter the source files. For example, we should remove `dependency.js` if it is not in our coverage scope.
```
> src/index.js
> src/components/app.js
```
For example:
```js
const coverageOptions = {
    entryFilter: (entry) => entry.url.indexOf("main.js") !== -1,
    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1
};
```
Or using `minimatch` pattern:
```js
const coverageOptions = {
    entryFilter: "**/main.js",
    sourceFilter: "**/src/**"
};
// supports multiple patterns:
const coverageOptions = {
    entryFilter: {
        '**/vendor.js': false,
        '**/main.js': true
    },
    sourceFilter: {
        '**/src/**': true
    }
};
```

## onEnd Hook
For example, checking thresholds:
```js
const EC = require('eight-colors');
const coverageOptions = {
    name: 'My Coverage Report',
    outputDir: './coverage-reports',
    onEnd: (coverageResults) => {
        const thresholds = {
            bytes: 80,
            lines: 60
        };
        console.log('check thresholds ...', thresholds);
        const errors = [];
        const { summary } = coverageResults;
        Object.keys(thresholds).forEach((k) => {
            const pct = summary[k].pct;
            if (pct < thresholds[k]) {
                errors.push(`Coverage threshold for ${k} (${pct} %) not met: ${thresholds[k]} %`);
            }
        });
        if (errors.length) {
            const errMsg = errors.join('\n');
            console.log(EC.red(errMsg));
            // throw new Error(errMsg);
            // process.exit(1);
        }
    }
}
```

## Command Line
> The CLI will run the program as a [child process](https://nodejs.org/docs/latest/api/child_process.html) with `NODE_V8_COVERAGE=dir` until it exits gracefully, and generate the coverage report with the coverage data from the `dir`.

- Installing globally
```sh
npm i monocart-coverage-reports -g
mcr node ./test/specs/node.test.js -r v8,console-summary --lcov
```

- Locally in your project
```sh
npm i monocart-coverage-reports
npx mcr node ./test/specs/node.test.js -r v8,console-summary --lcov
```

- CLI Options
```sh
Usage: mcr [options] <command>

CLI to generate coverage reports

Arguments:
  command                      command to execute

Options:
  -V, --version                output the version number
  -c, --config <path>          custom config file path
  --logging <logging>          off, error, info, debug
  -n, --name <name>            report name for title
  -r, --reports <name[,name]>  coverage reports to use
  -o, --outputDir <dir>        output dir for reports
  -i, --inputDir <dir>         input dir for merging raw files
  --entryFilter <pattern>      entry url filter
  --sourceFilter <pattern>     source path filter
  --outputFile <path>          output file for v8 report
  --inline                     inline html for v8 report
  --assetsPath <path>          assets path if not inline
  --lcov                       generate lcov.info file
  --import <module>            preload module at startup
  --require <module>           preload module at startup
  -h, --help                   display help for command
```

- Loading config file by priority:
    - Custom config file with `-c` or `--config`
    - `mcr.config.js`
    - `mcr.config.cjs`
    - `mcr.config.mjs`
    - `mcr.config.json` - json format
    - `mcr.config.ts` (requires preloading the ts execution module)
    - `.mcrrc.js`
    - `.mcrrc` - json format

- Working with `tsx`, see [mcr-tsx](https://github.com/cenfun/mcr-tsx)
    ```sh
    npx mcr --import tsx tsx ./src/example.ts
    ```

- Working with `ts-node`, see [mcr-ts-node](https://github.com/cenfun/mcr-ts-node)

## Compare Reports
| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| Coverage data | [Istanbul](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md) (Object) | [V8](#v8-coverage-data-format) (Array) | [V8](#v8-coverage-data-format) (Array) |
| Output | [Istanbul reports](#available-reports) | [V8 reports](#available-reports)  | [Istanbul reports](#available-reports) |
| - Bytes | ❌ | ✅ | ❌ |
| - Statements | ✅ | ✅ | ✅ |
| - Branches | ✅ | ✅ | ✅ |
| - Functions | ✅ | ✅ | ✅ |
| - Lines | ✅ | ✅ | ✅ |
| - Execution counts | ✅ | ✅ | ✅ |
| CSS coverage | ❌ | ✅ | ✅ |
| Minified code | ❌ | ✅ | ❌ |

## Compare Workflows
- Istanbul Workflows
    - 1, [Collecting Istanbul coverage data](#collecting-istanbul-coverage-data)
    - 2, Adding coverage data and generating coverage report

- V8 Workflows
    - 1, [Collecting V8 coverage data](#collecting-v8-coverage-data)
    - 3, Adding coverage data and generating coverage report

## Collecting Istanbul Coverage Data
- Instrumenting source code
    > Before collecting Istanbul coverage data, It requires your source code is instrumented with Istanbul
    - webpack: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul), example: [webpack.config-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/webpack.config-istanbul.js)
    - rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul)
    - vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul)
- Browser
    - Collecting coverage data from `window.__coverage__`, example: [test-istanbul.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-istanbul.js)
- Node.js
    - Collecting coverage data from `global.__coverage__`

## Collecting V8 Coverage Data
- For source code: enable `sourcemap` and do not compress/minify:
    - [webpack](https://webpack.js.org/configuration/): `devtool: source-map` and `mode: development`, example [webpack.config-v8.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/webpack.config-v8.js)
    - [rollup](https://rollupjs.org/configuration-options/): `sourcemap: true`
    - [vite](https://vitejs.dev/config/build-options.html): `sourcemap: true` and `minify: false`
    - [esbuild](https://esbuild.github.io/api/): `sourcemap: true` and `minify: false`
    - [Manually Resolve the Sourcemap](#manually-resolve-the-sourcemap)
- Browser (Chromium Only)
    > Collecting coverage data with [Chromium Coverage API](#chromium-coverage-api):
    - [Playwright example](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-v8.js), and [anonymous](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-anonymous.js), [css](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-css.js)
    - see [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)
- Node.js
    - see [Node.js V8 Coverage Report for Server Side](#nodejs-v8-coverage-report-for-server-side)
- CDP
    - see [Collecting V8 Coverage Data with `CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)

## Manually Resolve the Sourcemap
> Sometimes, the sourcemap file cannot be successfully loaded with the `sourceMappingURL`, you can try to manually read the sourcemap file before the coverage data is added to the report.
```js
const jsCoverage = await page.coverage.stopJSCoverage();
jsCoverage.forEach((entry) => {
    // read sourcemap for the my-dist.js manually
    if (entry.url.endsWith('my-dist.js')) {
        entry.sourceMap = JSON.parse(fs.readFileSync('dist/my-dist.js.map').toString('utf-8'));
    }
});

await MCR(coverageOptions).add(jsCoverage);

```

## Collecting Raw V8 Coverage Data with Puppeteer
> Puppeteer does not provide raw v8 coverage data by default. A simple conversion is required, see example: [./test/test-puppeteer.js](./test/test-puppeteer.js)
```js
await Promise.all([
    page.coverage.startJSCoverage({
        resetOnNavigation: false,
        // provide raw v8 coverage data
        includeRawScriptCoverage: true
    }),
    page.coverage.startCSSCoverage({
        resetOnNavigation: false
    })
]);

await page.goto(url);

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

## Node.js V8 Coverage Report for Server Side
Possible solutions:
- [NODE_V8_COVERAGE](https://nodejs.org/docs/latest/api/cli.html#node_v8_coveragedir)=`dir`
    - Sets Node.js env `NODE_V8_COVERAGE`=`dir` before the program running, the coverage data will be saved to the `dir` after the program exits gracefully.
    - Read the JSON file(s) from the `dir` and generate coverage report.
    - Example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-env` node [./test/test-node-env.js](./test/test-node-env.js) && node [./test/generate-report.js](./test/generate-report.js)

- [V8](https://nodejs.org/docs/latest/api/v8.html#v8takecoverage) API + NODE_V8_COVERAGE
    - Writing the coverage started by NODE_V8_COVERAGE to disk on demand with `v8.takeCoverage()`, it does not require waiting until the program exits gracefully.
    - Example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-api` node [./test/test-node-api.js](./test/test-node-api.js)

- [Inspector](https://nodejs.org/docs/latest/api/inspector.html) API
   - Connecting to the V8 inspector and enable V8 coverage.
   - Taking coverage data and adding it to the report.
   - Example: 
   > node [./test/test-node-ins.js](./test/test-node-ins.js)
   
- [CDP](https://chromedevtools.github.io/devtools-protocol/) API
    - Enabling [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started/).
    - Collecting coverage data with CDP API.
    - Example: 
    > node --inspect=9229 [./test/test-node-cdp.js](./test/test-node-cdp.js)

- [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started) + CDP + NODE_V8_COVERAGE + V8 API
    - When the program starts a server, it will not exit on its own, thus requiring a manual invocation of the `v8.takeCoverage()` interface to manually collect coverage data. Remote invocation of the `v8.takeCoverage()` interface can be accomplished through the `Runtime.evaluate` of the CDP.
    - Example for [koa](https://github.com/koajs/koa) web server:
    > node [./test/test-node-koa.js](./test/test-node-koa.js)

- [Child Process](https://nodejs.org/docs/latest/api/child_process.html) + NODE_V8_COVERAGE
    - see [Command Line](#command-line)

## Collecting V8 Coverage Data with `CDPClient` API
- Work with node debugger `--inspect=9229`
```js
const MCR = require('monocart-coverage-reports');
const client = await MCR.CDPClient({
    port: 9229
});
await client.startJSCoverage();
// run your test here
const coverageData = await client.stopJSCoverage();
```
- Work with [Playwright CDPSession](https://playwright.dev/docs/api/class-cdpsession)
```js
const { chromium } = require('playwright');
const MCR = require('monocart-coverage-reports');
const browser = await chromium.launch();
const page = await browser.newPage();
const session = await page.context().newCDPSession(page);
const client = await MCR.CDPClient({
    session
});
// both js and css coverage
await client.startCoverage();
// run your test page here
await page.goto("your page url");
const coverageData = await client.stopCoverage();
```
- Work with [Puppeteer CDPSession](https://pptr.dev/api/puppeteer.cdpsession)
```js
const puppeteer = require('puppeteer');
const MCR = require('monocart-coverage-reports');
const browser = await puppeteer.launch({});
const page = await browser.newPage();
const session = await page.target().createCDPSession();
const client = await MCR.CDPClient({
    session
});
// both js and css coverage
await client.startCoverage();
// run your test page here
await page.goto("your page url");
const coverageData = await client.stopCoverage();
```

## Multiprocessing Support
> The data will be added to `[outputDir]/.cache`, After the generation of the report, this data will be removed unless debugging has been enabled or a raw report has been used, see [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
- Main process, before the start of testing
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const coverageReport = MCR(coverageOptions);
// clean previous cache before the start of testing
// unless the running environment is new and no cache
coverageReport.cleanCache();
```

- Sub process 1, testing stage 1
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const coverageReport = MCR(coverageOptions);
// do not clean cache in the stage
await coverageReport.add(coverageData1);
```

- Sub process 2, testing stage 2
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const coverageReport = MCR(coverageOptions);
// do not clean cache in the stage
await coverageReport.add(coverageData2);
```

- Main process, after the completion of testing
```js
// generate coverage reports after the completion of testing
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const coverageReport = MCR(coverageOptions);
// do not clean cache before generating reports
await coverageReport.generate();
```

## Merge Coverage Reports
The following usage scenarios may require merging coverage reports:
- When the code is executed in different environments, like Node.js Server Side and browser Client Side (Next.js for instance). Each environment may generate its own coverage report. Merging them can give a more comprehensive view of the test coverage. see example [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright) for automatic report merging.
- When the code is subjected to different kinds of testing. For example, unit tests with Jest might cover certain parts of the code, while end-to-end tests with Playwright might cover other parts. Merging these different coverage reports can provide a holistic view of what code has been tested.
- When tests are run on different machines or different shards, each might produce its own coverage report. Merging these can give a complete picture of the test coverage across all machines or shards.

If the reports cannot be merged automatically, then here is how to manually merge the reports.
First, using the `raw` report to export the original coverage data to the specified directory.
```js
const coverageOptions = {
    name: 'My Unit Test Coverage Report',
    outputDir: "./coverage-reports/unit",
    reports: [
        ['raw', {
            // relative path will be "./coverage-reports/unit/raw"
            outputDir: "raw"
        }],
        ['v8'],
        ['console-summary']
    ]
};
```
Then, after all the tests are completed, generate a merged report with option `inputDir`:
```js
// esm syntax
import fs from "fs";
import { CoverageReport } from 'monocart-coverage-reports';
const coverageOptions = {
    name: 'My Merged Coverage Report',
    inputDir: [
        './coverage-reports/unit/raw',
        './coverage-reports/e2e/raw'
    ],
    outputDir: './coverage-reports/merged',
    reports: [
        ['v8'],
        ['console-summary']
    ],
    onEnd: () => {
        // remove the raw files if it useless
        fs.rmSync('./coverage-reports/unit/raw', {
            recursive: true,
            force: true
        })
    }
};
await new CoverageReport(coverageOptions).generate();
```

## Resolve `sourcePath` for the Source Files
If the source file comes from the sourcemap, then its path is a virtual path. Using the `sourcePath` option to resolve a custom path.
For example, we have tested multiple dist files, which contain some common files. We hope to merge the coverage of the same files, so we need to unify the `sourcePath` in order to be able to merge the coverage data.
```js
const coverageOptions = {
    sourcePath: (filePath) => {
        // Remove the virtual prefix
        const list = ['my-dist-file1/', 'my-dist-file2/'];
        for (const str of list) {
            if (filePath.startsWith(str)) {
                return filePath.slice(str.length);
            }
        }
        return filePath;
    }
};
```
It also supports simple key/value replacement:
```js
const coverageOptions = {
    sourcePath: {
        'my-dist-file1/': '', 
        'my-dist-file2/': ''
    }
};
```

## Adding Empty Coverage for Untested Files
By default the untested files will not be included in the coverage report, we can add empty coverage data for all files with option `all`, the untested files will show 0% coverage.
```js
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: (filePath) => {
            return true;
        }
    }
};
```
The filter also supports `minimatch` pattern:
```js
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: '**/*.js'
    }
};
// or multiple patterns
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: {
            // exclude files
            '**/ignored-*.js': false,
            '**/*.html': false,
            '**/*.ts': false,
            // empty css coverage
            '**/*.scss': "css",
            '**/*': true
        }
    }
};
```

## Ignoring Uncovered Codes
To ignore codes, use the special comment which starts with `v8 ignore `:
- Ignoring all until stop
```js
/* v8 ignore start */
function uncovered() {
}
/* v8 ignore stop */
```
- Ignoring the next line or next N lines
```js
/* v8 ignore next */
const os = platform === 'wind32' ? 'Windows' : 'Other';

const os = platform === 'wind32' ? 'Windows' /* v8 ignore next */ : 'Other';

// v8 ignore next 3
if (platform === 'linux') {
    console.log('hello linux');
}
```

## Chromium Coverage API
- [V8 coverage report](https://v8.dev/blog/javascript-code-coverage) - Native support for JavaScript code coverage to V8. (Chromium only)
- [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
- [Puppeteer Coverage class](https://pptr.dev/api/puppeteer.coverage)
- [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage)

## V8 Coverage Data Format
```js
// Coverage data for a source range.
export interface CoverageRange {
    // JavaScript script source offset for the range start.
    startOffset: integer;
    // JavaScript script source offset for the range end.
    endOffset: integer;
    // Collected execution count of the source range.
    count: integer;
}

// Coverage data for a JavaScript function.
/**
 * @functionName can be an empty string.
 * @ranges is always non-empty. The first range is called the "root range".
 * @isBlockCoverage indicates if the function has block coverage information.
    If this is false, it usually means that the functions was never called.
    It seems to be equivalent to ranges.length === 1 && ranges[0].count === 0.
*/
export interface FunctionCoverage {
    // JavaScript function name.
    functionName: string;
    // Source ranges inside the function with coverage data.
    ranges: CoverageRange[];
    // Whether coverage data for this function has block granularity.
    isBlockCoverage: boolean;
}

// Coverage data for a JavaScript script.
export interface ScriptCoverage {
    // JavaScript script id.
    scriptId: Runtime.ScriptId;
    // JavaScript script name or url.
    url: string;
    // Functions contained in the script that has coverage data.
    functions: FunctionCoverage[];
}

export type V8CoverageData = ScriptCoverage[];
```
see devtools-protocol [ScriptCoverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-ScriptCoverage) and [v8-coverage](https://github.com/bcoe/v8-coverage)

## How to convert V8 to Istanbul
### Using [v8-to-istanbul](https://github.com/istanbuljs/v8-to-istanbul)
It is a popular library which is used to convert V8 coverage format to istanbul's coverage format. Most test frameworks are using it, such as [Jest](https://github.com/jestjs/jest/), [Vitest](https://github.com/vitest-dev/vitest), but it has two major problems:
- 1, The source mapping does not work well if the position is between the two consecutive mappings. for example: 
```js
const a = tf ? 'true' : 'false';
               ^     ^  ^
              m1     p  m2
```
> `m1` and `m2` are two consecutive mappings, `p` is the position we looking for. However, we can only get the position of the `m1` or `m2` if we don't fix it to `p`. Especially the generated code is different from the original code, such as the code was minified, compressed or converted, it is difficult to find the exact position.

- 2, The coverage of functions and branches is incorrect. V8 only provided coverage at functions and it's blocks. But if a function is uncovered (count = 0), there is no information for it's blocks and sub-level functions. And also there are some problems about counting the functions and branches.

### How Monocart Works
We implemented new converter:
- 1, Trying to fix the middle position if not found the exact mapping for the position.
- 2, Finding all functions, statements and branches by parsing the source code [AST](https://github.com/acornjs/acorn). However, there's a small issue, which is the V8 cannot provide effective branch coverage information for `AssignmentPattern`.

| AST                   | V8             | 
| :---------------------| :------------- | 
| AssignmentPattern     | 🛇 Not Support | 
| ConditionalExpression | ✔  | 
| IfStatement           | ✔  | 
| LogicalExpression     | ✔  | 
| SwitchStatement       | ✔  | 

## Debug for Coverage and Sourcemap
> Sometimes, the coverage is not what we expect. The next step is to figure out why, and we can easily find out the answer step by step through debugging.
- Start debugging for v8 report with option `logging: 'debug'`
```js
const coverageOptions = {
    logging: 'debug',
    reports: [
        ['v8'],
        ['console-summary']
    ]
};
```
When `logging` is `debug`, the raw report data will be preserved in `[outputDir]/.cache` or `[outputDir]/raw` if `raw` report is used. And the dist file will be preserved in the V8 list, and by opening the browser's devtool, it makes data verification visualization effortless.
![](./assets/debug-coverage.png)

- Check sourcemap with [Source Map Visualization](https://evanw.github.io/source-map-visualization/)

![](./assets/debug-sourcemap.png)

## Common issues
- `Unparsable source`

It happens during the parsing of the source code into AST, if the source code is not in the standard ECMAScript. For example `ts`, `jsx` and so on. There is a option to fix it, which is to manually compile the source code for these files.
```js
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as TsNode from 'ts-node';
const coverageOptions = {
    onEntry: async (entry) => {
        const filePath = fileURLToPath(entry.url)
        const originalSource = fs.readFileSync(filePath).toString("utf-8");
        const fileName = path.basename(filePath);
        const tn = TsNode.create({});
        const source = tn.compile(originalSource, fileName);
        entry.fake = false;
        entry.source = source;
    }
}
```

## Integration

### [Playwright](https://github.com/microsoft/playwright)
- [monocart-reporter](https://github.com/cenfun/monocart-reporter) - A Playwright custom reporter, supports generating [Code Coverage Report](https://github.com/cenfun/monocart-reporter?#code-coverage-report)
- Coverage for component testing:
    - [playwright-ct-vue](https://github.com/cenfun/playwright-ct-vue)
    - [playwright-ct-react](https://github.com/cenfun/playwright-ct-react)
    - [playwright-ct-svelte](https://github.com/cenfun/playwright-ct-svelte)
- Coverage for Next.js, both server side and client side:
    - [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
    - [nextjs-with-playwright-istanbul](https://github.com/cenfun/nextjs-with-playwright-istanbul)

### [Jest](https://github.com/jestjs/jest/)
- [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage) - A Jest custom reporter for coverage reports
- Example for Jest (unit) + Puppeteer (e2e) + Codecov: [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)

### [Vitest](https://github.com/vitest-dev/vitest)
- [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage) - A Vitest custom provider module for coverage reports

### [Cypress](https://github.com/cypress-io/cypress)
- [cypress-monocart-coverage](https://github.com/cenfun/cypress-monocart-coverage) - A Cypress plugin for coverage reports

### [CodeceptJS](https://github.com/codeceptjs/CodeceptJS)
- CodeceptJS has integrated MCR from version [3.5.15](https://github.com/codeceptjs/CodeceptJS/releases/tag/3.5.15)
- [codeceptjs-monocart-coverage](https://github.com/cenfun/codeceptjs-monocart-coverage) - A CodeceptJS plugin for coverage reports

### [WebdriverIO](https://github.com/webdriverio/webdriverio)
- [wdio-monocart-service](https://github.com/cenfun/wdio-monocart-service) - A WebdriverIO service for coverage reports

### [Storybook Test Runner](https://github.com/storybookjs/test-runner)
- [storybook-monocart-coverage](https://github.com/cenfun/storybook-monocart-coverage) - Storybook V8 Coverage Example

### [TestCafe](https://github.com/DevExpress/testcafe)
- [testcafe-reporter-coverage](https://github.com/cenfun/testcafe-reporter-coverage) - A TestCafe custom reporter for coverage reports

### [Codecov](https://codecov.com/)
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
- Supports native `codecov` built-in report ([specification](https://docs.codecov.com/docs/codecov-custom-coverage-format))
```js
const coverageOptions = {
    outputDir: "./coverage-reports",
    reports: [
        ['codecov']
    ]
};
```
- Github actions example:
```yml
- name: Codecov
    uses: codecov/codecov-action@v3
    with:
        files: ./coverage-reports/codecov.json
```
### [Coveralls](https://coveralls.io/)
[![Coverage Status](https://coveralls.io/repos/github/cenfun/monocart-coverage-reports/badge.svg?branch=main)](https://coveralls.io/github/cenfun/monocart-coverage-reports?branch=main)
- Using `lcov` report:
```js
const coverageOptions = {
    outputDir: "./coverage-reports",
    lcov: true
};
```
- Github actions example:
```yml
- name: Coveralls
    uses: coverallsapp/github-action@v2
    with:
        files: ./coverage-reports/lcov.info
```
### [Sonar Cloud](https://sonarcloud.io/)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=monocart-coverage-reports&metric=coverage)](https://sonarcloud.io/summary/new_code?id=monocart-coverage-reports)
- Using `lcov` report. Github actions example:
```yml
- name: Analyze with SonarCloud
    uses: sonarsource/sonarcloud-github-action@master
    env: 
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    with:
        projectBaseDir: ./
        args: >
        -Dsonar.organization=cenfun
        -Dsonar.projectKey=monocart-coverage-reports
        -Dsonar.projectName=monocart-coverage-reports
        -Dsonar.javascript.lcov.reportPaths=docs/mcr/lcov.info
        -Dsonar.sources=lib
        -Dsonar.tests=test
        -Dsonar.exclusions=dist/*,packages/*
```
### Integration with Any Testing Framework
- Collecting coverage data when any stage of the test is completed, and adding the coverage data to the coverage reporter.
- Generating the coverage reports after the completion of all tests.
- see [Multiprocessing Support](#multiprocessing-support)

### VSCode Extension
- [Coverage Gutters](https://github.com/ryanluker/vscode-coverage-gutters) - Display test coverage generated by lcov or xml in VSCode editor.

## Thanks
- Special thanks to [@edumserrano](https://github.com/edumserrano)