![Monocart Coverage Reports](./assets/og-image.png)

# Monocart Coverage Reports

[![npm](https://img.shields.io/npm/v/monocart-coverage-reports)](https://www.npmjs.com/package/monocart-coverage-reports)
![license](https://img.shields.io/github/license/cenfun/monocart-coverage-reports)
![build](https://img.shields.io/github/actions/workflow/status/cenfun/monocart-coverage-reports/ci.yml)
[![install size](https://packagephobia.com/badge?p=monocart-coverage-reports)](https://packagephobia.com/result?p=monocart-coverage-reports)
[![npm graph](https://img.shields.io/badge/npm-graph-blue)](https://npmgraph.js.org/?q=monocart-coverage-reports)
![dependencies](https://img.shields.io/librariesio/github/cenfun/monocart-coverage-reports)
[![downloads](https://devimg.vercel.app/npm/downloads/monocart-coverage-reports?label={total}%20downloads/month)](https://www.npmjs.com/package/monocart-coverage-reports)

🌐 English | [简体中文](https://cenfun.github.io/monocart-coverage-reports/zh/)

> A JavaScript code coverage tool to generate native [V8](https://v8.dev/blog/javascript-code-coverage) reports or [Istanbul](https://istanbul.js.org/) reports.


## Usage
> **MCR 3.x requires [Node.js >= 22.15.0](https://nodejs.org/)** for all APIs and CLI commands, including ordinary commands, `merge` and `test`.

**Upgrading from 2.x:** See the [3.x migration guide](https://cenfun.github.io/monocart-coverage-reports/migrations/migration-to-3.html).

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
For more information, see [Command Line](https://cenfun.github.io/monocart-coverage-reports/reference/cli.html#command-line) and [Run Tests with `mcr test`](https://cenfun.github.io/monocart-coverage-reports/guide/node-test-runner.html#run-tests-with-mcr-test)

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
Using `import` and load options from [config file](https://cenfun.github.io/monocart-coverage-reports/guide/configuration.html#config-file)
```js
import { CoverageReport } from 'monocart-coverage-reports';
const mcr = new CoverageReport();
await mcr.loadConfig();
```
> Both `MCR({...})` and `new CoverageReport()` create the same instance. `MCR()` is a shorthand factory function; use `new CoverageReport()` when you prefer class instantiation or need to call `loadConfig()` separately.

For more information, see [Multiprocessing Support](https://cenfun.github.io/monocart-coverage-reports/guide/multiprocessing.html#multiprocessing-support)

## Documentation

- [Full documentation](https://cenfun.github.io/monocart-coverage-reports/) / [简体中文](https://cenfun.github.io/monocart-coverage-reports/zh/)
- [Best practices](https://cenfun.github.io/monocart-coverage-reports/guide/best-practices.html)
- [Playwright](https://cenfun.github.io/monocart-coverage-reports/integrations/playwright.html)
- [Configuration options](https://cenfun.github.io/monocart-coverage-reports/reference/options.html)
- [Report Examples](https://cenfun.github.io/monocart-coverage-reports/examples.html)
- [3.x migration guide](https://cenfun.github.io/monocart-coverage-reports/migrations/migration-to-3.html)
- [AI Agent Skill](skills/monocart-coverage-reports/SKILL.md) (bundled with npm; usable offline)
- [Contributing](https://cenfun.github.io/monocart-coverage-reports/contributing.html)
- [Changelog](CHANGELOG.md)

## License

MIT
