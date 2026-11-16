# Best practices {#best-practices}

For new test setups, prefer native coverage collection without an instrumentation step:

| Target | Recommended setup | Responsibility |
| --- | --- | --- |
| Node.js | **Node.js native test runner + `mcr test`** | `node:test` runs assertions; MCR automatically collects native V8 JavaScript coverage and generates reports. |
| Browser | **Playwright Test + MCR** | Playwright runs assertions; automatic fixtures collect Chromium JS/CSS coverage; MCR merges it and generates reports. |
| Browser with integrated test reporting | **Playwright Test + [monocart-reporter](https://github.com/cenfun/monocart-reporter#code-coverage-report)** | The reporter already integrates MCR; configure its coverage option and submit coverage from fixtures for unified test and coverage reporting. |

For detailed setup instructions and examples, see the [best-practices guide](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/references/best-practices.md).
