# Reports and custom reporters {#available-reports}

> V8 built-in reports (V8 data only):

- `v8`
    - Features:
        - A Brand-New V8 Coverage Report User Interface
        - Support for Native Byte Statistics
        - Support processing big data with high performance
        - Coverage for Any Runtime Code
        - CSS Coverage Support
        - Better Support for Sourcemap Conversion
    - Demos: [V8](https://cenfun.github.io/monocart-coverage-reports/reports/v8) and [more](/examples)

![](../../assets/v8.gif)

- `v8-json`
    - Save `CoverageResults` to a json file (defaults to [`coverage-report.json`](https://cenfun.github.io/monocart-coverage-reports/reports/v8-and-istanbul/coverage-report.json)).
    - Shows native V8 code coverage with VSCode extension: [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)

![](../../assets/mcv.gif)

> Istanbul built-in reports (both V8 and Istanbul data):

- `clover`
- `cobertura`
- `html`
    - [Istanbul html](https://cenfun.github.io/monocart-coverage-reports/reports/istanbul/)
    - [V8 to Istanbul](https://cenfun.github.io/monocart-coverage-reports/reports/v8-and-istanbul/istanbul)
- `html-spa`
- `json`
- `json-summary`
- `lcov`
- `lcovonly`
    - [V8 lcov.info](https://cenfun.github.io/monocart-coverage-reports/reports/v8/lcov.info)
    - [Istanbul lcov.info](https://cenfun.github.io/monocart-coverage-reports/reports/istanbul/lcov.info)
- `none`
- `teamcity`
- `text`
- `text-lcov`
- `text-summary`

> Other built-in reports (both V8 and Istanbul data):

- `codecov` Save coverage data to a json file with [Codecov](https://docs.codecov.com/docs/codecov-custom-coverage-format) format (defaults to `codecov.json`), see [example](https://app.codecov.io/github/cenfun/monocart-coverage-reports).

- `codacy` Save coverage data to a json file with [Codacy API](https://api.codacy.com/swagger#tocscoveragereport) format (defaults to `codacy.json`).

- `console-summary` shows coverage summary in the console.

![](../../assets/console-summary.png)

- `console-details` Show coverage details in the console. Like `text`, but for V8. For Github actions, we can enforce color with env: `FORCE_COLOR: true`.

![](../../assets/console-details.png)

- `markdown-summary` Save coverage summary to a markdown file (defaults to `coverage-summary.md`). For Github actions, we can show the markdown content to [a job summary](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary)
```sh
cat path-to/coverage-summary.md >> $GITHUB_STEP_SUMMARY
```
![](../../assets/markdown-summary.png)

- `markdown-details` Save coverage details to a markdown file (defaults to `coverage-details.md`).
    - Preview in [runs](https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml)

- `raw` only keep all original data, which can be used for other reports input with `inputDir`. see [Merge Coverage Reports](/guide/merging#merge-coverage-reports)

- Custom Reporter
    ```js
    const coverageOptions = {
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
    };
    ```
    - Istanbul custom reporter
    > example: [./test/custom-istanbul-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-istanbul-reporter.js), see [istanbul built-in reporters' implementation](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) for reference.
    - V8 custom reporter
    > example: [./test/custom-v8-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-v8-reporter.js)

    The `type` option selects the reporter interface and when it runs:
    - `'istanbul'` — uses the Istanbul reporter interface: `new Reporter(reportOptions)` followed by `execute(context)`. The context provides Istanbul report trees and source lookup. V8 input is converted to Istanbul coverage first.
    - `'v8'` (default) — uses `new Reporter(reportOptions, globalOptions)` followed by `await generate(reportData)` for V8 input. `reportData` is the V8 coverage result, with `type`, `summary` and `files`; each file contains V8 ranges and summaries.
    - `'both'` — uses the same `generate(reportData)` interface for either V8 or Istanbul input. Check `reportData.type` to handle the corresponding result structure. This does **not** supply both raw formats together; there are no `v8Data` or `istanbulData` properties.

    Reporters are loaded with native ESM `import()`. Use `export default Reporter` for ESM; Node's built-in interoperability also accepts CommonJS `module.exports = Reporter` (use `.cjs` inside an ESM project). Local paths must include the file extension; extensionless paths and directory entries are not resolved. No separate CommonJS loader is provided. Reporter loading and initialization errors reject report generation instead of silently skipping the reporter.

## Multiple Reports: {#multiple-reports}
```js
import { MCR } from 'monocart-coverage-reports';
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        // built-in reports
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
        ['custom-reporter-1'],
        ['custom-reporter-2', {
            type: 'istanbul',
            key: 'value'
        }],
        // Specify reporter name with local path
        ['/absolute/path/to/custom-reporter.js']
    ]
};
const mcr = MCR(coverageOptions);
```
