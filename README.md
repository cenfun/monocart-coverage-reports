# Monocart Coverage Reports

[![npm](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![license](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)
![build](https://img.shields.io/github/actions/workflow/status/cenfun/monocart-coverage-reports/ci.yml)
[![install size](https://packagephobia.com/badge?p=monocart-coverage-reports)](https://packagephobia.com/result?p=monocart-coverage-reports)
[![npm graph](https://img.shields.io/badge/npm-graph-blue)](https://npmgraph.js.org/?q=monocart-coverage-reports)
![dependencies](https://img.shields.io/librariesio/github/cenfun/monocart-coverage-reports)
[![downloads](https://devimg.vercel.app/npm/downloads/monocart-coverage-reports?label={total}%20downloads/month)](https://www.npmjs.com/package/monocart-coverage-reports)

🌐 English | [简体中文](README.zh-Hans.md)

> A JavaScript code coverage tool to generate native [V8](https://v8.dev/blog/javascript-code-coverage) reports or [Istanbul](https://istanbul.js.org/) reports.

* [Usage](#usage)
* [Options](#options)
* [Available Reports](#available-reports)
* [Compare Reports](#compare-reports)
* [Collecting Istanbul Coverage Data](#collecting-istanbul-coverage-data)
* [Collecting V8 Coverage Data](#collecting-v8-coverage-data)
    - [Collecting V8 Coverage Data with Playwright](#collecting-v8-coverage-data-with-playwright)
    - [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)
    - [Collecting V8 Coverage Data from Node.js](#collecting-v8-coverage-data-from-nodejs)
    - [Collecting V8 Coverage Data with `CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)
    - [V8 Coverage Data API](#v8-coverage-data-api)
* [Filtering Results](#filtering-results)
* [Resolve `sourcePath` for the Source Files](#resolve-sourcepath-for-the-source-files)
* [Adding Empty Coverage for Untested Files](#adding-empty-coverage-for-untested-files)
* [onEnd Hook](#onend-hook)
* [Ignoring Uncovered Codes](#ignoring-uncovered-codes)
* [Multiprocessing Support](#multiprocessing-support)
* [Command Line](#command-line)
* [Config File](#config-file)
* [Merge Coverage Reports](#merge-coverage-reports)
    - [Automatic Merging](#automatic-merging)
    - [Manual Merging](#manual-merging)
* [Common issues](#common-issues)
    - [Unexpected coverage](#unexpected-coverage)
    - [Unparsable source](#unparsable-source)
    - [JavaScript heap out of memory](#javascript-heap-out-of-memory)
* [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
* [Integration with Any Testing Framework](#integration-with-any-testing-framework)
* [Integration Examples](#integration-examples)
    - [Playwright](#playwright)
    - [c8](#c8)
    - [CodeceptJS](#codeceptjs)
    - [VSCode](#vscode)
    - [Jest](#jest)
    - [Vitest](#vitest)
    - [Node Test Runner](#node-test-runner)
    - [Puppeteer](#puppeteer)
    - [Cypress](#cypress)
    - [WebdriverIO](#webdriverio)
    - [Storybook Test Runner](#storybook-test-runner)
    - [TestCafe](#testcafe)
    - [Selenium Webdriver](#selenium-webdriver)
    - [Mocha](#mocha)
    - [TypeScript](#typescript)
    - [AVA](#ava)
    - [Codecov](#codecov)
    - [Codacy](#codacy)
    - [Coveralls](#coveralls)
    - [Sonar Cloud](#sonar-cloud)
* [Contributing](#contributing)
* [Changelog](CHANGELOG.md)
* [Thanks](#thanks)

## Usage
> It's recommended to use [Node.js 20+](https://nodejs.org/).
- Install
```sh
npm install monocart-coverage-reports
```
- API
```js
const MCR = require('monocart-coverage-reports');
const mcr = MCR({
    name: 'My Coverage Report - 2024-02-28',
    outputDir: './coverage-reports',
    reports: ["v8", "console-details"],
    cleanCache: true
});
await mcr.add(coverageData);
await mcr.generate();
```
Using `import` and load options from [config file](#config-file)
```js
import { CoverageReport } from 'monocart-coverage-reports';
const mcr = new CoverageReport();
await mcr.loadConfig();
```
For more information, see [Multiprocessing Support](#multiprocessing-support)

- CLI
```sh
mcr node my-app.js -r v8,console-details
```
For more information, see [Command Line](#command-line)

## Options
- Default options: [lib/default/options.js](./lib/default/options.js)
- Options declaration see `CoverageReportOptions` [lib/index.d.ts](./lib/index.d.ts)
- [Config file](#config-file)

## Available Reports

> V8 build-in reports (V8 data only):

- `v8`
    - Features: 
        - A Brand-New V8 Coverage Report User Interface
        - Support for Native Byte Statistics
        - Support processing big data with high performance
        - Coverage for Any Runtime Code
        - CSS Coverage Support
        - Better Support for Sourcemap Conversion
    - Demos: [V8](https://cenfun.github.io/monocart-coverage-reports/v8) and [more](https://cenfun.github.io/monocart-coverage-reports/)

![](./assets/v8.gif)

- `v8-json`
    - Save `CoverageResults` to a json file (defaults to [`coverage-report.json`](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/coverage-report.json)).
    - Shows native V8 code coverage with VSCode extension: [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)

![](./assets/mcv.gif)

> Istanbul build-in reports (both V8 and Istanbul data):

- `clover`
- `cobertura`
- `html`
    - [Istanbul html](https://cenfun.github.io/monocart-coverage-reports/istanbul/) 
    - [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/v8-and-istanbul/istanbul)
- `html-spa`
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

> Other build-in reports (both V8 and Istanbul data):

- `codecov` Save coverage data to a json file with [Codecov](https://docs.codecov.com/docs/codecov-custom-coverage-format) format (defaults to `codecov.json`), see [example](https://app.codecov.io/github/cenfun/monocart-coverage-reports).

- `codacy` Save coverage data to a json file with [Codacy API](https://api.codacy.com/swagger#tocscoveragereport) format (defaults to `codacy.json`).

- `console-summary` shows coverage summary in the console.

![](./assets/console-summary.png)

- `console-details` Show coverage details in the console. Like `text`, but for V8. For Github actions, we can enforce color with env: `FORCE_COLOR: true`.

![](./assets/console-details.png)

- `markdown-summary` Save coverage summary to a markdown file (defaults to `coverage-summary.md`). For Github actions, we can show the markdown content to [a job summary](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)
```sh
cat path-to/coverage-summary.md >> $GITHUB_STEP_SUMMARY
```
![](./assets/markdown-summary.png)

- `markdown-details` Save coverage details to a markdown file (defaults to `coverage-details.md`).
    - Preview in [runs](https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml)

- `raw` only keep all original data, which can be used for other reports input with `inputDir`. see [Merge Coverage Reports](#merge-coverage-reports)

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
    - Istanbul custom reporter
    > example: [./test/custom-istanbul-reporter.js](./test/custom-istanbul-reporter.js), see [istanbul built-in reporters' implementation](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) for reference.
    - V8 custom reporter
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
const mcr = MCR(coverageOptions);
```

## Compare Reports
> If the V8 data format is used for Istanbul reports, it will be automatically converted from V8 to Istanbul.

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

## Collecting Istanbul Coverage Data
- Before coverage collection: Instrumenting source code with Istanbul
    - webpack with babel loader: [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul), see example: [webpack.config-istanbul.js](./test/build/webpack.config-istanbul.js)
    - CLI: [nyc instrument](https://github.com/istanbuljs/nyc/blob/master/docs/instrument.md) or API: [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-lib-instrument/api.md)
    - vite: [vite-plugin-istanbul](https://github.com/ifaxity/vite-plugin-istanbul)
    - rollup: [rollup-plugin-istanbul](https://github.com/artberri/rollup-plugin-istanbul)
    - swc: [swc-plugin-coverage-instrument](https://github.com/kwonoj/swc-plugin-coverage-instrument)

- Browser
    - Collecting coverage data from `window.__coverage__`, example: [test-istanbul.js](./test/test-istanbul.js)

- Node.js
    - Collecting coverage data from `global.__coverage__`

- CDP
    - `getIstanbulCoverage()` see [`CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)

## Collecting V8 Coverage Data
- Before coverage collection: Enabling `sourcemap` for source code
    - [webpack](https://webpack.js.org/configuration/): `devtool: source-map` and `mode: development`, example [webpack.config-v8.js](./test/build/webpack.config-v8.js)
    - [rollup](https://rollupjs.org/configuration-options/): `sourcemap: true` and `treeshake: false`
    - [esbuild](https://esbuild.github.io/api/): `sourcemap: true`, `treeShaking: false` and `minify: false`
    - [vite](https://vitejs.dev/config/build-options.html): `sourcemap: true` and `minify: false`

- Browser (Chromium-based Only)
    - [Collecting V8 Coverage Data with Playwright](#collecting-v8-coverage-data-with-playwright)
    - [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)

- Node.js
    - [Collecting V8 Coverage Data from Node.js](#collecting-v8-coverage-data-from-nodejs)

- CDP
    - [Collecting V8 Coverage Data with `CDPClient` API](#collecting-v8-coverage-data-with-cdpclient-api)

### Collecting V8 Coverage Data with Playwright
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

await page.goto("your page url");

const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage()
]);

const coverageData = [... jsCoverage, ... cssCoverage];

```
Collect coverage with `@playwright/test` [`Automatic fixtures`](https://playwright.dev/docs/test-fixtures#automatic-fixtures), see example: [fixtures.ts](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.ts)
For more examples, see [./test/test-v8.js](./test/test-v8.js), [css](./test/test-css.js)


### Collecting Raw V8 Coverage Data with Puppeteer
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

await page.goto("your page url");

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
Example: [./test/test-puppeteer.js](./test/test-puppeteer.js)

### Collecting V8 Coverage Data from Node.js
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
   - vm Example (scriptOffset):
   > node [./test/test-node-vm.js](./test/test-node-vm.js)
   
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

### Collecting V8 Coverage Data with `CDPClient` API
- `CDPClient` available APIs
```js
startJSCoverage: () => Promise<void>;
stopJSCoverage: () => Promise<V8CoverageEntry[]>;

startCSSCoverage: () => Promise<void>;
stopCSSCoverage: () => Promise<V8CoverageEntry[]>;

/** start both js and css coverage */
startCoverage: () => Promise<void>;
/** stop and return both js and css coverage */
stopCoverage: () => Promise<V8CoverageEntry[]>;

/** write the coverage started by NODE_V8_COVERAGE to disk on demand, returns v8 coverage dir */
writeCoverage: () => Promise<string>;

/** get istanbul coverage data */
getIstanbulCoverage: (coverageKey?: string) => Promise<any>;
```

- Work with node debugger port `--inspect=9229` or browser debugging port `--remote-debugging-port=9229`
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

- Work with [Selenium Webdriver](https://www.selenium.dev/documentation/webdriver/) WebSocket (Chrome/Edge Browser)
```js
const { Builder, Browser } = require('selenium-webdriver');
const MCR = require('monocart-coverage-reports');
const driver = await new Builder().forBrowser(Browser.CHROME).build();
const pageCdpConnection = await driver.createCDPConnection('page');
const session = new MCR.WSSession(pageCdpConnection._wsConnection);
const client = await MCR.CDPClient({
    session
})
```

### V8 Coverage Data API
- [JavaScript code coverage in V8](https://v8.dev/blog/javascript-code-coverage)
- [Playwright Coverage Class](https://playwright.dev/docs/api/class-coverage)
- [Puppeteer Coverage Class](https://pptr.dev/api/puppeteer.coverage)
- [DevTools Protocol for Coverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) see [ScriptCoverage](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-ScriptCoverage) and [v8-coverage](https://github.com/bcoe/v8-coverage)
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

| JavaScript Runtime | V8 Coverage |  |
| :--------------| :----: | :----------------------  |
| Chrome (65%) | ✅ | Chromium-based |
| Safari (18%) | ❌ |  |
| Edge (5%) | ✅ | Chromium-based |
| Firefox (2%) | ❌ |  |
| Node.js | ✅ |  |
| Deno | ❌ | [issue](https://github.com/denoland/deno/issues/23359) |
| Bun | ❌ |  |

## Filtering Results
### Using `entryFilter` and `sourceFilter` to filter the results for V8 report
When V8 coverage data collected, it actually contains the data of all entry files, for example:

- *dist/main.js*
- *dist/vendor.js*
- *dist/something-else.js*

We can use `entryFilter` to filter the entry files. For example, we should remove `vendor.js` and `something-else.js` if they are not in our coverage scope. 

- *dist/main.js*

When inline or linked sourcemap exists to the entry file, the source files will be extracted from the sourcemap for the entry file, and the entry file will be removed if `logging` is not `debug`.

- *src/index.js*
- *src/components/app.js*
- *node_modules/dependency/dist/dependency.js*

We can use `sourceFilter` to filter the source files. For example, we should remove `dependency.js` if it is not in our coverage scope.

- *src/index.js*
- *src/components/app.js*

For example:
```js
const coverageOptions = {
    entryFilter: (entry) => entry.url.indexOf("main.js") !== -1,
    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1
};
```
Or using [`minimatch`](https://github.com/isaacs/minimatch) pattern:
```js
const coverageOptions = {
    entryFilter: "**/main.js",
    sourceFilter: "**/src/**"
};
```
Support multiple patterns:
```js
const coverageOptions = {
    entryFilter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/src/**': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/**': true
    }
};
```
As CLI args (JSON-like string. Added in: v2.8):
```sh
mcr --sourceFilter "{'**/node_modules/**':false,'**/**':true}"
```
Note, those patterns will be transformed to a function, and the order of the patterns will impact the results:
```js
const coverageOptions = {
    entryFilter: (entry) => {
        if (minimatch(entry.url, '**/node_modules/**')) { return false; }
        if (minimatch(entry.url, '**/vendor.js')) { return false; }
        if (minimatch(entry.url, '**/src/**')) { return true; }
        return false; // else unmatched
    }
};
```

### Using `filter` instead of `entryFilter` and `sourceFilter`
If you don't want to define both `entryFilter` and `sourceFilter`, you can use `filter` instead. (Added in: v2.8)
```js
const coverageOptions = {
    // combined patterns
    filter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/src/**': true
        '**/**': true
    }
};
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
Normalize the full path of the file:
```js
const path = require("path")

// MCR coverage options
const coverageOptions = {
    sourcePath: (filePath, info)=> {
        if (!filePath.includes('/') && info.distFile) {
            return `${path.dirname(info.distFile)}/${filePath}`;
        }
        return filePath;
    }
}
```

## Adding Empty Coverage for Untested Files
By default the untested files will not be included in the coverage report, we can add empty coverage for untested files with option `all`, the untested files will show 0% coverage.
```js
const coverageOptions = {
    all: './src',

    // or multiple dirs
    all: ['./src', './lib'],
};
```
The untested files will apply to the `sourceFilter`. And it also supports additional `filter` (return the file type for js or css coverage):
```js
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: {
            // exclude files
            '**/ignored-*.js': false,
            '**/*.html': false,
            // empty css coverage
            '**/*.scss': "css",
            '**/*': true
        }
    }
};
```
We can also compile these untested files, such as .ts, .jsx, or .vue, etc., so that they can be analyzed by the default AST parser, thus get more coverage metric data.
```js
const path = require("path");
const swc = require("@swc/core");
const coverageOptions = {
    all: {
        dir: ['./src'],
        transformer: async (entry) => {
            const { code, map } = await swc.transform(entry.source, {
                filename: path.basename(entry.url),
                sourceMaps: true,
                isModule: true,
                jsc: {
                    parser: {
                        syntax: "typescript",
                        jsx: true
                    },
                    transform: {}
                }
            });
            entry.source = code;
            entry.sourceMap = JSON.parse(map);
        }
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
- Compatible with [c8 coverage](https://github.com/bcoe/c8/?tab=readme-ov-file#ignoring-all-lines-until-told) or [nodejs coverage](https://nodejs.org/docs/latest/api/test.html#collecting-code-coverage) syntax
```js
/* c8 ignore start */
function uncovered() {
}
/* c8 ignore stop */

/* node:coverage disable */
function uncovered() {
}
/* node:coverage enable */
```

## Multiprocessing Support
> The data will be added to `[outputDir]/.cache`, After the generation of the report, this data will be removed unless debugging has been enabled or a raw report has been used, see [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)
- Main process, before the start of testing
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const mcr = MCR(coverageOptions);
// clean previous cache before the start of testing
// unless the running environment is new and no cache
mcr.cleanCache();
```

- Sub process 1, testing stage 1
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const mcr = MCR(coverageOptions);
await mcr.add(coverageData1);
```

- Sub process 2, testing stage 2
```js
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const mcr = MCR(coverageOptions);
await mcr.add(coverageData2);
```

- Main process, after the completion of testing
```js
// generate coverage reports after the completion of testing
const MCR = require('monocart-coverage-reports');
const coverageOptions = require('path-to/same-options.js');
const mcr = MCR(coverageOptions);
await mcr.generate();
```

## Command Line
> The CLI will run the program as a [child process](https://nodejs.org/docs/latest/api/child_process.html) with `NODE_V8_COVERAGE=dir` until it exits gracefully, and generate the coverage report with the coverage data from the `dir`.

- Installing globally
```sh
npm i monocart-coverage-reports -g
mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

- Locally in your project
```sh
npm i monocart-coverage-reports
npx mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

- CLI Options
see all options with running `mcr` or `mcr --help`

- Use `--` to separate sub CLI args
```sh
mcr -c mcr.config.js -- sub-cli -c sub-cli.config.js
```

- Examples
    - [Mocha](#mocha)
    - [TypeScript](#typescript)
    - [AVA](#ava)

## Config File
Loading config file by priority:
- Custom config file:
    - CLI: `mcr --config <my-config-file-path>`
    - API: `await mcr.loadConfig("my-config-file-path")`
- `mcr.config.js`
- `mcr.config.cjs`
- `mcr.config.mjs`
- `mcr.config.json` - json format
- `mcr.config.ts` (requires preloading the ts execution module)

## Merge Coverage Reports
The following usage scenarios may require merging coverage reports:
- When the code is executed in different environments, like Node.js `server side` and browser `client side` (`Next.js` for instance). Each environment may generate its own coverage report. Merging them can give a more comprehensive view of the test coverage.
- When the code is subjected to different kinds of testing. For example, `unit tests` with `Jest` might cover certain parts of the code, while `end-to-end tests` with `Playwright` might cover other parts. Merging these different coverage reports can provide a holistic view of what code has been tested.
- When tests are run on different machines or containers, each might produce its own coverage report. Merging these can give a complete picture of the test coverage across all machines or shards.

### Automatic Merging
- The `MCR` will automatically merge all the added coverage data when executing `generate()`. And it supports adding coverage data asynchronously across processes, see [Multiprocessing Support](#multiprocessing-support)
- For `Next.js`, it can actually add coverage data including both server side and client side before executing `generate()`, see example [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
- Using `Codecov`, a popular online code coverage service, which supports automatic merging of reports. Please use report `codecov`, it will generate report file `codecov.json`. If multiple `codecov.json` files are generated, upload all these files, they will be automatically merged. see [Codecov](#codecov) and [merging reports](https://docs.codecov.com/docs/merging-reports)

### Manual Merging
If the reports cannot be merged automatically, then here is how to manually merge the reports.  
First, using the `raw` report to export the original coverage data to the specified directory.
- For example, we have `raw` coverage data from `unit test`, which is output to `./coverage-reports/unit/raw`. Unit test examples:
    - `Jest` + [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage)
    - `Vitest` + [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage)
```js
const coverageOptions = {
    name: 'My Unit Test Coverage Report',
    outputDir: "./coverage-reports/unit",
    reports: [
        ['raw', {
            // relative path will be "./coverage-reports/unit/raw"
            // defaults to raw
            outputDir: "raw"
        }],
        ['v8'],
        ['console-details']
    ]
};
```

- We also have `raw` coverage data from `e2e test`, which is output to `./coverage-reports/e2e/raw`. E2E test examples:
    - `Playwright` + [monocart-reporter](https://github.com/cenfun/monocart-reporter) with coverage API
    - `Playwright` + `MCR`, see [playwright-coverage](https://github.com/cenfun/playwright-coverage)
    - see more [Integration Examples](#integration-examples)

- Then create a script `merge-coverage.js` to generate a merged report with option `inputDir`.
```js
// merge-coverage.js
const fs = require('fs');
const { CoverageReport } = require('monocart-coverage-reports');
const inputDir = [
    './coverage-reports/unit/raw',
    './coverage-reports/e2e/raw'
];
const coverageOptions = {
    name: 'My Merged Coverage Report',
    inputDir,
    outputDir: './coverage-reports/merged',

    // filter for both unit and e2e
    entryFilter: {
        '**/node_modules/**': false,
        '**/*': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    },
    
    sourcePath: (filePath, info) => {
        // Unify the file path for the same files
        // For example, the file index.js has different paths:
        // unit: unit-dist/src/index.js
        // e2e: e2e-dist/src/index.js
        // return filePath.replace("unit-dist/", "").replace("e2e-dist/", "")
        return filePath;
    },

    reports: [
        ['v8'],
        ['console-details']
    ],
    
    onEnd: () => {
        // remove the raw files if it useless
        // inputDir.forEach((p) => {
        //     fs.rmSync(p, {
        //         recursive: true,
        //         force: true
        //     });
        // });
    }
};
await new CoverageReport(coverageOptions).generate();
```
- Running script `node path/to/merge-coverage.js` after all the tests are completed. All the command scripts are probably like following:
```json
{
    "scripts": {
        "test:unit": "jest",
        "test:e2e": "playwright test",
        "merge-coverage": "node path/to/merge-coverage.js",
        "test": "npm run test:unit && npm run test:e2e && npm run merge-coverage"
    }
}
```
see example: [merge-code-coverage](https://github.com/cenfun/merge-code-coverage)

## Common issues
### Unexpected coverage
In most cases, it happens when the coverage of the generated code is converted to the coverage of the original code through a sourcemap. In other words, it's an issue with the sourcemap. Most of the time, we can solve this by setting `minify` to `false` in the configuration of build tools. Let's take a look at an example:
```js
const a = tf ? 'true' : 'false';
               ^     ^  ^
              m1     p  m2
```
In the generated code, there is a position `p`, and we need to find out its corresponding position in the original code. Unfortunately, there is no matched mapping for the position `p`. Instead, it has two adjacent upstream and downstream mappings `m1` and `m2`, so, the original position of `p` that we are looking for, might not be able to be precisely located. Especially, the generated code is different from the original code, such as the code was minified, compressed or converted, it is difficult to find the exact original position without matched mapping. 
- Further understanding of sourcemap, try [Debug for Coverage and Sourcemap](#debug-for-coverage-and-sourcemap)

How `MCR` Works:
- 1, Trying to fix the original position with string comparison and [`diff-sequences`](https://github.com/jestjs/jest/tree/main/packages/diff-sequences). However, for non-JS code, such as Vue template, JSX, etc., it might be hard to find a perfect solution.
- 2, Finding all functions, statements and branches by parsing the source code [AST](https://github.com/acornjs/acorn). (There is a small issue is the V8 cannot provide effective branch coverage information for `AssignmentPattern`)


### Unparsable source
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

### JavaScript heap out of memory
When there are a lot of raw v8 coverage files to process, it may cause OOM. We can try the following Node.js options:
```sh
- run: npm run test:coverage
    env:
        NODE_OPTIONS: --max-old-space-size=8192
```


## Debug for Coverage and Sourcemap
> Sometimes, the coverage is not what we expect. The next step is to figure out why, and we can easily find out the answer step by step through debugging.
- Start debugging for v8 report with option `logging: 'debug'`
```js
const coverageOptions = {
    logging: 'debug',
    reports: [
        ['v8'],
        ['console-details']
    ]
};
```
When `logging` is `debug`, the raw report data will be preserved in `[outputDir]/.cache` or `[outputDir]/raw` if `raw` report is used. And the dist file will be preserved in the V8 list, and by opening the browser's devtool, it makes data verification visualization effortless.
![](./assets/debug-coverage.png)

- Check sourcemap with [Source Map Visualization](https://evanw.github.io/source-map-visualization/)

![](./assets/debug-sourcemap.png)

- Generate additional source and sourcemap files to cache or raw dir
```js
const coverageOptions = {
    logging: 'debug',
    sourceMap: true
};
```

- Show time logs with env `MCR_LOG_TIME`
```js
process.env.MCR_LOG_TIME = true
```

## Integration with Any Testing Framework
- API
    - Collecting coverage data when any stage of the test is completed, and adding the coverage data to the coverage reporter. `await mcr.add(coverageData)`
    - Generating the coverage reports after the completion of all tests. `await mcr.generate()`
    - see [Multiprocessing Support](#multiprocessing-support)
- CLI
    - Wrapping with any CLI. `mcr your-cli --your-arguments`
    - see [Command line](#command-line)

## Integration Examples

### [Playwright](https://github.com/microsoft/playwright)
- [playwright-coverage](https://github.com/cenfun/playwright-coverage) - Example for Playwright coverage reports
- [playwright-bdd-coverage](https://github.com/cenfun/playwright-bdd-coverage) - Example for Playwright BDD coverage reports
- [monocart-reporter](https://github.com/cenfun/monocart-reporter) - Playwright custom reporter, supports generating [Code coverage report](https://github.com/cenfun/monocart-reporter?#code-coverage-report)
- Coverage for component testing with `monocart-reporter`:
    - [playwright-ct-vue](https://github.com/cenfun/playwright-ct-vue)
    - [playwright-ct-react](https://github.com/cenfun/playwright-ct-react)
    - [playwright-ct-svelte](https://github.com/cenfun/playwright-ct-svelte)
- Coverage for Next.js, both server side and client side:
    - [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
    - [nextjs-with-playwright-istanbul](https://github.com/cenfun/nextjs-with-playwright-istanbul)
- Coverage for Remix:
    - [remix-with-playwright](https://github.com/cenfun/remix-with-playwright)
- see [Collecting V8 Coverage Data with Playwright](#collecting-v8-coverage-data-with-playwright)

### [c8](https://github.com/bcoe/c8)
- c8 has integrated `MCR` as an experimental feature since [v10.1.0](https://github.com/bcoe/c8/releases/tag/v10.1.0)
```sh
c8 --experimental-monocart --reporter=v8 --reporter=console-details node foo.js
```

### [CodeceptJS](https://github.com/codeceptjs/CodeceptJS)
- CodeceptJS is a [BDD](https://codecept.io/bdd/) + [AI](https://codecept.io/ai/) testing framework for e2e testing, it has integrated `MCR` since [v3.5.15](https://github.com/codeceptjs/CodeceptJS/releases/tag/3.5.15), see [plugins/coverage](https://codecept.io/plugins/#coverage)

### [VSCode](https://github.com/microsoft/vscode)
- [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode) - Shows native V8 code coverage in VSCode

### [Jest](https://github.com/jestjs/jest/)
- [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage) - Jest custom reporter for coverage reports
- [merge-code-coverage](https://github.com/cenfun/merge-code-coverage) - Example for merging code coverage (Jest unit + Playwright e2e sharding)

### [Vitest](https://github.com/vitest-dev/vitest)
- [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage) - Vitest custom provider module for coverage reports
- [merge-code-coverage-vitest](https://github.com/cenfun/merge-code-coverage-vitest) - Example for merging code coverage (Vitest unit + Playwright e2e sharding)

### [Node Test Runner](https://nodejs.org/docs/latest/api/test.html)
- [node-monocart-coverage](https://github.com/cenfun/node-monocart-coverage) - Custom reporter for Node test runner for coverage

### [Puppeteer](https://github.com/puppeteer/puppeteer/)
- [jest-puppeteer-coverage](https://github.com/cenfun/jest-puppeteer-coverage) - Example for Jest puppeteer coverage
- [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) - Example for Jest (unit) + Puppeteer (e2e) + Codecov
- see [Collecting Raw V8 Coverage Data with Puppeteer](#collecting-raw-v8-coverage-data-with-puppeteer)

### [Cypress](https://github.com/cypress-io/cypress)
- [cypress-monocart-coverage](https://github.com/cenfun/cypress-monocart-coverage) - Cypress plugin for coverage reports

### [WebdriverIO](https://github.com/webdriverio/webdriverio)
- [wdio-monocart-service](https://github.com/cenfun/wdio-monocart-service) - WebdriverIO service for coverage reports

### [Storybook Test Runner](https://github.com/storybookjs/test-runner)
- [storybook-monocart-coverage](https://github.com/cenfun/storybook-monocart-coverage) - Example for Storybook V8 coverage reports

### [TestCafe](https://github.com/DevExpress/testcafe)
- [testcafe-reporter-coverage](https://github.com/cenfun/testcafe-reporter-coverage) - TestCafe custom reporter for coverage reports

### [Selenium Webdriver](https://github.com/seleniumhq/selenium)
- [selenium-webdriver-coverage](https://github.com/cenfun/selenium-webdriver-coverage) - Example for Selenium Webdriver V8 coverage reports

### [Mocha](https://github.com/mochajs/mocha)
```sh
mcr mocha ./test/**/*.js
```

### [TypeScript](https://github.com/microsoft/typescript)

- [tsx](https://github.com/privatenumber/tsx)
```sh
cross-env NODE_OPTIONS="--import tsx" npx mcr tsx ./src/example.ts
cross-env NODE_OPTIONS="--import tsx" npx mcr mocha ./test/**/*.ts
# Node.js v18.19.0 +
mcr --import tsx tsx ./src/example.ts
mcr --import tsx mocha ./test/**/*.ts
```
- [ts-node](https://github.com/TypeStrong/ts-node)
```sh
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr ts-node ./src/example.ts
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr mocha ./test/**/*.ts
```

### [AVA](https://github.com/avajs/ava)
```sh
mcr ava
```

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
- Github actions:
```yml
- name: Codecov
    uses: codecov/codecov-action@v4
    with:
        token: ${{ secrets.CODECOV_TOKEN }}
        files: ./coverage-reports/codecov.json
```

### [Codacy](https://www.codacy.com/)
[![Codacy](https://app.codacy.com/project/badge/Coverage/715016ea8e90479db875b777db8bad55)](https://app.codacy.com/gh/cenfun/monocart-coverage-reports/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
- Using `lcov` report:
```js
const coverageOptions = {
    outputDir: "./coverage-reports",
    lcov: true
};
```
- Github actions:
```yml
- name: Codacy Coverage Reporter
    uses: codacy/codacy-coverage-reporter-action@v1
    with:
        project-token: ${{ secrets.CODACY_PROJECT_TOKEN }}
        coverage-reports: ./docs/mcr/lcov.info
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
- Github actions:
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

## Contributing
- Node.js 20+
- VSCode (extensions: eslint/stylelint/vue)
```sh
npm install
npx playwright install --with-deps

npm run build
npm run test

npm run dev
```
- Refreshing `eol=lf` for snapshot of test (Windows)
```sh
git add . -u
git commit -m "Saving files before refreshing line endings"

npm run eol
```

## Thanks
- [@bcoe](https://github.com/bcoe)
- [@edumserrano](https://github.com/edumserrano)