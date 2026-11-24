# Get started {#get-started}

Monocart Coverage Reports (MCR) turns JavaScript, TypeScript and CSS coverage data into HTML and other reports.

## Installation {#installation}

Requires [Node.js >= 22.18.0](https://nodejs.org/).

```sh
npm i monocart-coverage-reports -D
```

**MCR is ESM-only since v3.** CommonJS projects can load it with asynchronous `import()`; see the [migration guide](/migrations/migration-to-3) for usage and 2.x upgrades.

## CLI {#cli}

For projects using Node.js's built-in test runner, start with [Run tests with mcr test](/getting-started/node-test-runner#quick-start): run tests, collect coverage and generate reports with one command, without a config file.

### Generate your first report {#first-report}

If you do not have test files yet, create `demo.js` to try coverage with a simple script:

```js
console.log('Hello, MCR!');
```

Run it with coverage:

```sh
npx mcr node demo.js -r v8,console-summary -o ./coverage-reports
```

Open `./coverage-reports/index.html` in your browser; the terminal also prints a coverage summary. Use a dedicated output directory: [previous report output is cleaned by default](/reference/options#clean).

Replace `node demo.js` with your own Node.js command. See [CLI options](/reference/cli) for more.

## API {#api}

If a browser fixture or test framework already collects coverage, pass that data to MCR. Use this example after [collecting V8 coverage](/coverage-collection/v8#generate):

```js
import { MCR } from 'monocart-coverage-reports';

const mcr = MCR({
    outputDir: './coverage-reports',
    reports: ['v8', 'console-summary'],
    cleanCache: true
});
await mcr.add(coverageData);
const coverageResults = await mcr.generate();
if (!coverageResults) {
    throw new Error('No coverage report was generated');
}
console.log(coverageResults.reportPath);
```

### Coverage data and results {#coverage-data}

In this example, `coverageData` is an array of [V8 coverage entries](/reference/coverage-data#coverage-entries). For an [Istanbul coverage object](/coverage-collection/istanbul#generate), use `reports: ['html', 'console-summary']` instead.

`coverageResults` is the output returned by `generate()`; see [`CoverageResults`](/reference/types#coverageresults) for its fields.

### Configuration {#load-config}

See [configuration files](/reference/configuration#minimal-config), [loading config with the API](/reference/configuration#api) and [configuration options](/reference/options).

## Next steps {#next-steps}

- Already have a test framework? See [how to integrate it](/integrations/integrate-with-your-framework).
- Choosing a collection method? Start with [V8 vs Istanbul](/coverage-collection/compare-reports).
- Want to see the output? Browse [report examples](/getting-started/examples) or choose a [report format](/reference/reports).
