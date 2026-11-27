# Best practices {#best-practices}

For new test setups, prefer native coverage collection without an instrumentation step:

## Node.js {#nodejs}

Recommended setup: **Node.js native test runner + `mcr test`**.

`node:test` runs assertions; MCR automatically collects native V8 JavaScript coverage and generates reports.

See [Run tests with mcr test](/pages/node-test-runner#run-tests-with-mcr-test) for details.

## Browser {#browser}

Recommended setup: **Playwright Test + MCR**.

Playwright runs assertions; automatic fixtures collect Chromium JS/CSS coverage; MCR merges it and generates reports.

See [Playwright coverage collection](/pages/v8#playwright) and the [automatic fixture example](https://github.com/cenfun/playwright-coverage/blob/main/fixtures.js) for setup details.

## Integrated test reporting {#integrated-reporting}

For browser tests that need unified test and coverage reporting, use **Playwright Test + monocart-reporter**.

The reporter already integrates MCR; configure its coverage option and submit coverage from fixtures.

See the [monocart-reporter coverage report guide](https://github.com/cenfun/monocart-reporter#code-coverage-report) for configuration details.

## Further reading {#further-reading}

For detailed setup instructions and examples, see the [best-practices guide](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/references/best-practices.md).
