---
outline: [2, 4]
---

<script setup>
import { withBase } from 'vitepress';
</script>

# Reports {#reports}

Use the report names below in the [API `reports` option](/pages/get-started#api) or a [config file](/pages/configuration#minimal-config); the CLI option is [`-r, --reports`](/pages/options#configuration-options). Supported input formats are listed by category below; for service-specific choices, see [Coverage services](/pages/coverage-services).

The configuration snippets below show report options only; use the [API example](/pages/get-started#api) for the complete add-and-generate flow.

## Configuration templates {#configuration-templates}

Use the code block’s copy button to paste a template into `mcr.config.mjs` at the project root. If you already have a config file, merge in the options you need. The CLI loads the config automatically; if you use the API, [load it explicitly](/pages/configuration#api) or pass the options to `CoverageReport`. Keep using your existing test workflow to collect coverage.

### Local V8 report {#local-v8-template}

Use this with V8 input for an interactive HTML report and a per-file summary in the terminal.

```js
export default {
    outputDir: './coverage-reports/local',
    reports: ['v8', 'console-details']
};
```

### CI report and LCOV {#ci-report-template}

Use this with V8 or Istanbul input. Keep the terminal summary in the CI log, archive `./coverage-reports/ci` for the HTML report, and pass `./coverage-reports/ci/lcov.info` to tools that accept LCOV. The summary does not enforce a [coverage threshold](/pages/hooks#coverage-thresholds).

```js
export default {
    outputDir: './coverage-reports/ci',
    reports: ['console-summary', 'html', 'lcovonly']
};
```

### CI shard export {#ci-shard-template}

Use this with V8 input in each isolated CI job to export raw coverage without generating HTML in every shard. If jobs share a workspace, use a different `outputDir` for each one. Save each job’s `./coverage-reports/shard/raw` directory (or `raw` under its custom `outputDir`) as a separate, uniquely named artifact. [Review raw artifacts before sharing](./merging#raw-artifact-safety). Download them into separate directories and verify that every shard produced coverage [before merging](./merging#manual-merging).

```js
export default {
    outputDir: './coverage-reports/shard',
    reports: ['raw']
};
```

## Built-in reports {#built-in-reports}

### V8 {#v8-reports}

Supports V8 coverage data only.

#### `v8` <span role="img" aria-label="Recommended" title="Recommended">⭐</span> {#v8}

Generate an interactive HTML report with JavaScript and CSS coverage and native byte metrics. When matching source maps are available, the report maps coverage from generated code back to the original sources. See the [V8 report examples](/pages/examples#v8-and-istanbul).

Use the button in the report header to switch between light and dark mode. The report follows your system theme by default and remembers your manual choice until the system theme changes.

![File tree and source coverage in the V8 report](/images/v8.gif)

#### `v8-json` {#v8-json}

- Save [`CoverageResults`](/pages/types#coverageresults) to a json file (defaults to [`coverage-report.json`](/reports/v8-and-istanbul/coverage-report.json)).
- For `data.extras` codes and examples, see [Line classifications](/pages/coverage-data#line-classifications).
- Shows native V8 code coverage with VSCode extension: [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode)

![](/images/mcv.gif)

### Istanbul {#istanbul-reports}

Supports both V8 and Istanbul coverage data.

#### `clover` {#clover}

Generate a Clover XML coverage report.

#### `cobertura` {#cobertura}

Generate a Cobertura XML coverage report.

#### `html` {#html}

- Preview: [Istanbul HTML reports from instrumented and converted V8 data](/pages/examples#v8-and-istanbul).

#### `html-spa` {#html-spa}

Generate an Istanbul single-page HTML coverage report.

#### `json` {#json}

Save Istanbul coverage data as JSON.

#### `json-summary` {#json-summary}

Save coverage summaries as JSON.

#### `lcov` {#lcov}

Generate LCOV coverage data and an HTML report.

#### `lcovonly` {#lcovonly}

Generate LCOV data without HTML. Examples: <a :href="withBase('/reports/v8/lcov.info')" target="_blank" rel="noopener noreferrer">V8 lcov.info</a> and <a :href="withBase('/reports/istanbul/lcov.info')" target="_blank" rel="noopener noreferrer">Istanbul lcov.info</a>.

#### `none` {#none}

Do not write an Istanbul report.

#### `teamcity` {#teamcity}

Output coverage statistics as TeamCity service messages.

#### `text` {#text}

Display file coverage details in the console.

#### `text-lcov` {#text-lcov}

Output LCOV coverage data to the console.

#### `text-summary` {#text-summary}

Display a coverage summary in the console.

### Shared reports {#shared-reports}

These built-in reports support both V8 and Istanbul coverage data.

#### `codecov` {#codecov}

Save coverage data to a json file with [Codecov](https://docs.codecov.com/docs/codecov-custom-coverage-format) format (defaults to `codecov.json`), see [example](https://app.codecov.io/github/cenfun/monocart-coverage-reports).

#### `codacy` {#codacy}

Save coverage data to a json file with [Codacy API](https://api.codacy.com/swagger#tocscoveragereport) format (defaults to `codacy.json`).

#### `console-summary` <span role="img" aria-label="Recommended" title="Recommended">⭐</span> {#console-summary}

Shows coverage summary in the console.

![](/images/console-summary.png)

#### `console-details` <span role="img" aria-label="Recommended" title="Recommended">⭐</span> {#console-details}

Show coverage details in the console. Like `text`, but for V8. For Github actions, we can enforce color with env: `FORCE_COLOR: true`.

![](/images/console-details.png)

#### `markdown-summary` {#markdown-summary}

Save the overall coverage summary to a Markdown file (defaults to `coverage-summary.md`). To display it in a workflow run, see [GitHub Actions job summaries](/pages/coverage-services#job-summary).

![](/images/markdown-summary.png)

#### `markdown-details` {#markdown-details}

Save coverage details to a markdown file (defaults to `coverage-details.md`).

- Preview in [runs](https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml)

#### `raw` {#raw}

Keep all original data, which can be used for other reports input with `inputDir`. see [Merge Coverage Reports](/pages/merging#merging-reports)

## Custom reports {#custom-reports}

Configure custom reports using a reporter module path or npm package name. The `type` option selects the reporter interface.

```js
import path from 'node:path';

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

### `istanbul` — Istanbul custom reports {#custom-istanbul}

`'istanbul'` — uses the Istanbul reporter interface: `new Reporter(reportOptions)` followed by `execute(context)`. The context provides Istanbul report trees and source lookup. V8 input is converted to Istanbul coverage first.

example: [./test/custom-istanbul-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-istanbul-reporter.js), see [istanbul built-in reporters' implementation](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) for reference.

### `v8` — V8 custom reports {#custom-v8}

`'v8'` (default) — uses `new Reporter(reportOptions, globalOptions)` followed by `await generate(reportData)` for V8 input. [`reportData`](/pages/types#coverageresults) is the V8 coverage result, with `type`, [`summary`](/pages/types#coveragesummary) and [`files`](/pages/types#coveragefile); each file contains V8 ranges and summaries.

example: [./test/custom-v8-reporter.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/custom-v8-reporter.js)

### `both` — Custom reports for both formats {#custom-both}

`'both'` — uses the same `generate(reportData)` interface for either V8 or Istanbul input. Check `reportData.type` to handle the corresponding result structure. This does **not** supply both raw formats together; there are no `v8Data` or `istanbulData` properties.

### Module loading {#module-loading}

Reporters are loaded with native ESM `import()`. Use `export default Reporter` for ESM; Node's built-in interoperability also accepts CommonJS `module.exports = Reporter` (use `.cjs` inside an ESM project). Local paths must include the file extension; extensionless paths and directory entries are not resolved. No separate CommonJS loader is provided. Reporter loading and initialization errors reject report generation instead of silently skipping the reporter.

## Multiple Reports {#multiple-reports}

This example shows how to combine built-in and custom reports. Replace the custom reporter package names and paths before using it.

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

## Report Examples {#report-examples}

Explore generated V8, Istanbul, browser, Node.js and CSS reports on the [Report Examples](/pages/examples) page.
