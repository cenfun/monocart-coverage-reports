# Frameworks and tools {#frameworks-and-tools}

Find integrations for the [Node.js test runner](#node-test-runner), [browser tests](#playwright), [Vitest and Jest](#vitest), [TypeScript](#typescript), or [VS Code](#vscode). If your framework is not listed, see [generic CLI and API integration](/pages/integrate-with-your-framework).

## [Node.js test runner](https://nodejs.org/docs/latest/api/test.html) {#node-test-runner}

**Recommended:** Use `mcr test` to run tests with Node.js's built-in runner and generate coverage reports in one command. See [Run tests with mcr test](/pages/node-test-runner#run-tests-with-mcr-test) to get started.

If you need to configure a custom coverage reporter for an existing `node --test` workflow, use [node-monocart-coverage](https://github.com/cenfun/node-monocart-coverage).

## [Playwright](https://playwright.dev/) {#playwright}

For collection code, see [Collect V8 coverage with Playwright](/pages/v8#playwright).

- [playwright-coverage](https://github.com/cenfun/playwright-coverage) - Example for Playwright coverage reports
- [playwright-bdd-coverage](https://github.com/cenfun/playwright-bdd-coverage) - Example for Playwright BDD coverage reports
- [monocart-reporter](https://github.com/cenfun/monocart-reporter) - Playwright custom reporter, supports generating [Code coverage report](https://github.com/cenfun/monocart-reporter#code-coverage-report)
- Coverage for component testing with `monocart-reporter`:
    - [playwright-ct-vue](https://github.com/cenfun/playwright-ct-vue)
    - [playwright-ct-react](https://github.com/cenfun/playwright-ct-react)
    - [playwright-ct-svelte](https://github.com/cenfun/playwright-ct-svelte)
- Coverage for Next.js, both server side and client side:
    - [nextjs-with-playwright](https://github.com/cenfun/nextjs-with-playwright)
    - [nextjs-with-playwright-istanbul](https://github.com/cenfun/nextjs-with-playwright-istanbul)
- Coverage for Remix:
    - [remix-with-playwright](https://github.com/cenfun/remix-with-playwright)

::: info Next step
Running Playwright in CI shards or alongside unit tests? Export raw coverage from each run and combine it into one report.

[Merge Playwright coverage](/pages/merging#manual-merging)
:::

## [Puppeteer](https://pptr.dev/) {#puppeteer}

For collection code, see [Collect V8 coverage with Puppeteer](/pages/v8#puppeteer).

- [jest-puppeteer-coverage](https://github.com/cenfun/jest-puppeteer-coverage) - Example for Jest puppeteer coverage
- [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) - Example for Jest (unit) + Puppeteer (e2e) + Codecov

## [Vitest](https://github.com/vitest-dev/vitest) {#vitest}
- [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage) - Vitest custom provider module for coverage reports
- [merge-code-coverage-vitest](https://github.com/cenfun/merge-code-coverage-vitest) - Example for merging code coverage (Vitest unit + Playwright e2e sharding)

::: info Next step
Combine Vitest unit-test coverage with end-to-end coverage to see what the two suites cover together.

[Merge Vitest coverage](/pages/merging#unit-test-coverage)
:::

## [Jest](https://github.com/jestjs/jest/) {#jest}
- [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage) - Jest custom reporter for coverage reports
- [merge-code-coverage](https://github.com/cenfun/merge-code-coverage) - Example for merging code coverage (Jest unit + Playwright e2e sharding)

::: info Next step
Combine Jest unit-test coverage with Playwright end-to-end coverage in a single report.

[Merge Jest coverage](/pages/merging#unit-test-coverage)
:::

## [TypeScript](https://github.com/microsoft/typescript) {#typescript}

For Node.js 22.18.0 or later, prefer built-in type stripping to run TypeScript with erasable syntax. No build step or external loader is needed.

```sh
npx mcr node ./src/example.ts
npx mcr test "./test/**/*.test.ts"
```

For setup and coverage behavior, see [TypeScript support](/pages/typescript#typescript-support). For `tsx` and `ts-node` examples, see [External loaders](/pages/typescript#external-loaders).

## [VSCode](https://github.com/microsoft/vscode) {#vscode}
- [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode) - Shows native V8 code coverage in VSCode

## [Cypress](https://github.com/cypress-io/cypress) {#cypress}
- [cypress-monocart-coverage](https://github.com/cenfun/cypress-monocart-coverage) - Cypress plugin for coverage reports

## [WebdriverIO](https://github.com/webdriverio/webdriverio) {#webdriverio}
- [wdio-monocart-service](https://github.com/cenfun/wdio-monocart-service) - WebdriverIO service for coverage reports

## [Storybook Test Runner](https://github.com/storybookjs/test-runner) {#storybook-test-runner}
- [storybook-monocart-coverage](https://github.com/cenfun/storybook-monocart-coverage) - Example for Storybook V8 coverage reports

## [Selenium Webdriver](https://github.com/seleniumhq/selenium) {#selenium-webdriver}
- [selenium-webdriver-coverage](https://github.com/cenfun/selenium-webdriver-coverage) - Example for Selenium Webdriver V8 coverage reports

## [CodeceptJS](https://github.com/codeceptjs/CodeceptJS) {#codeceptjs}
- CodeceptJS is a [BDD](https://codecept.io/bdd/) + [AI](https://codecept.io/ai/) testing framework for e2e testing, it has integrated `MCR` since [v3.5.15](https://github.com/codeceptjs/CodeceptJS/releases/tag/3.5.15), see [plugins/coverage](https://codecept.io/plugins/#coverage)

## [TestCafe](https://github.com/DevExpress/testcafe) {#testcafe}
- [testcafe-reporter-coverage](https://github.com/cenfun/testcafe-reporter-coverage) - TestCafe custom reporter for coverage reports

## [c8](https://github.com/bcoe/c8) {#c8}
- c8 has integrated `MCR` as an experimental feature since [v10.1.0](https://github.com/bcoe/c8/releases/tag/v10.1.0)
```sh
c8 --experimental-monocart --reporter=v8 --reporter=console-details node foo.js
```

For Node.js's built-in test runner, we recommend using `mcr test` instead of a separate coverage collection workflow; see [Run tests with mcr test](/pages/node-test-runner#run-tests-with-mcr-test).

## [Mocha](https://github.com/mochajs/mocha) {#mocha}
```sh
mcr mocha ./test/**/*.js
```

For Node.js unit and integration tests, we recommend using `mcr test` instead; see [Run tests with mcr test](/pages/node-test-runner#run-tests-with-mcr-test).

## [AVA](https://github.com/avajs/ava) {#ava}
```sh
mcr ava
```

For Node.js unit and integration tests, we recommend using `mcr test` instead; see [Run tests with mcr test](/pages/node-test-runner#run-tests-with-mcr-test).

---

<small>Note: Replacing a test runner with `mcr test` means migrating to `node:test`, not just changing the command; test APIs, assertions and hooks may need adapting.</small>
