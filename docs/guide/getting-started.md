# Quick start {#usage}
> **MCR 3.x requires [Node.js >= 22.15.0](https://nodejs.org/)** for all APIs and CLI commands, including ordinary commands, `merge` and `test`.

**Upgrading from 2.x:** See the [3.x migration guide](/migrations/migration-to-3).

- Install as a dev dependency
```sh
npm i monocart-coverage-reports -D
```
- CLI
```sh
# Run tests with the Node.js test runner and collect native V8 coverage
npx mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
# Or run any Node.js command with coverage
npx mcr node my-app.js -r v8,console-details
```
For more information, see [Command Line](/reference/cli#command-line) and [Run Tests with `mcr test`](/guide/node-test-runner#run-tests-with-mcr-test)

- API
```js
import { MCR } from 'monocart-coverage-reports';
const mcr = MCR({
    name: 'My Coverage Report - 2024-02-28',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-details'],
    cleanCache: true
});
await mcr.add(coverageData);
await mcr.generate();
```
Using `import` and load options from [config file](/guide/configuration#config-file)
```js
import { CoverageReport } from 'monocart-coverage-reports';
const mcr = new CoverageReport();
await mcr.loadConfig();
```
> Both `MCR({...})` and `new CoverageReport()` create the same instance. `MCR()` is a shorthand factory function; use `new CoverageReport()` when you prefer class instantiation or need to call `loadConfig()` separately.

For more information, see [Multiprocessing Support](/guide/multiprocessing#multiprocessing-support)
