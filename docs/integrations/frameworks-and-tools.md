# Frameworks and tools {#frameworks-and-tools}

## [Playwright](https://playwright.dev/) {#playwright}

For collection code, see [Collect V8 coverage with Playwright](/coverage-collection/v8#playwright).

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

## [Puppeteer](https://pptr.dev/) {#puppeteer}

For collection code, see [Collect V8 coverage with Puppeteer](/coverage-collection/v8#puppeteer).

- [jest-puppeteer-coverage](https://github.com/cenfun/jest-puppeteer-coverage) - Example for Jest puppeteer coverage
- [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) - Example for Jest (unit) + Puppeteer (e2e) + Codecov

## [CodeceptJS](https://github.com/codeceptjs/CodeceptJS) {#codeceptjs}
- CodeceptJS is a [BDD](https://codecept.io/bdd/) + [AI](https://codecept.io/ai/) testing framework for e2e testing, it has integrated `MCR` since [v3.5.15](https://github.com/codeceptjs/CodeceptJS/releases/tag/3.5.15), see [plugins/coverage](https://codecept.io/plugins/#coverage)

## [VSCode](https://github.com/microsoft/vscode) {#vscode}
- [Monocart Coverage for VSCode](https://github.com/cenfun/monocart-coverage-vscode) - Shows native V8 code coverage in VSCode

## [Jest](https://github.com/jestjs/jest/) {#jest}
- [jest-monocart-coverage](https://github.com/cenfun/jest-monocart-coverage) - Jest custom reporter for coverage reports
- [merge-code-coverage](https://github.com/cenfun/merge-code-coverage) - Example for merging code coverage (Jest unit + Playwright e2e sharding)

## [Vitest](https://github.com/vitest-dev/vitest) {#vitest}
- [vitest-monocart-coverage](https://github.com/cenfun/vitest-monocart-coverage) - Vitest custom provider module for coverage reports
- [merge-code-coverage-vitest](https://github.com/cenfun/merge-code-coverage-vitest) - Example for merging code coverage (Vitest unit + Playwright e2e sharding)

## [Cypress](https://github.com/cypress-io/cypress) {#cypress}
- [cypress-monocart-coverage](https://github.com/cenfun/cypress-monocart-coverage) - Cypress plugin for coverage reports

## [WebdriverIO](https://github.com/webdriverio/webdriverio) {#webdriverio}
- [wdio-monocart-service](https://github.com/cenfun/wdio-monocart-service) - WebdriverIO service for coverage reports

## [Storybook Test Runner](https://github.com/storybookjs/test-runner) {#storybook-test-runner}
- [storybook-monocart-coverage](https://github.com/cenfun/storybook-monocart-coverage) - Example for Storybook V8 coverage reports

## [TestCafe](https://github.com/DevExpress/testcafe) {#testcafe}
- [testcafe-reporter-coverage](https://github.com/cenfun/testcafe-reporter-coverage) - TestCafe custom reporter for coverage reports

## [Selenium Webdriver](https://github.com/seleniumhq/selenium) {#selenium-webdriver}
- [selenium-webdriver-coverage](https://github.com/cenfun/selenium-webdriver-coverage) - Example for Selenium Webdriver V8 coverage reports

## [TypeScript](https://github.com/microsoft/typescript) {#typescript}

For Node's native erasable syntax, use a recent Node.js and run without an external TS loader/parser:

```sh
mcr node ./src/example.ts
mcr test "./test/*.test.ts"
```

See [TypeScript support](/reference/typescript#typescript-support) for requirements, configuration and limitations. Projects needing additional syntax can retain the runtimes below.

- [tsx](https://github.com/privatenumber/tsx)
```sh
cross-env NODE_OPTIONS="--import tsx" npx mcr tsx ./src/example.ts
cross-env NODE_OPTIONS="--import tsx" npx mcr mocha ./test/**/*.ts
# MCR 3.x: Node.js >= 22.18.0
mcr --import tsx tsx ./src/example.ts
mcr --import tsx mocha ./test/**/*.ts
```
- [ts-node](https://github.com/TypeStrong/ts-node)
```sh
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr ts-node ./src/example.ts
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr mocha ./test/**/*.ts
```

## [c8](https://github.com/bcoe/c8) {#c8}
- c8 has integrated `MCR` as an experimental feature since [v10.1.0](https://github.com/bcoe/c8/releases/tag/v10.1.0)
```sh
c8 --experimental-monocart --reporter=v8 --reporter=console-details node foo.js
```

For Node.js's built-in test runner, we recommend using `mcr test` instead of a separate coverage collection workflow; see [Run tests with mcr test](/getting-started/node-test-runner#run-tests-with-mcr-test).

## [Node Test Runner](https://nodejs.org/docs/latest/api/test.html) {#node-test-runner}
- [node-monocart-coverage](https://github.com/cenfun/node-monocart-coverage) - Custom reporter for Node test runner for coverage

We recommend using `mcr test` directly instead of configuring a separate coverage reporter; see [Run tests with mcr test](/getting-started/node-test-runner#run-tests-with-mcr-test).

## [Mocha](https://github.com/mochajs/mocha) {#mocha}
```sh
mcr mocha ./test/**/*.js
```

For Node.js unit and integration tests, we recommend using `mcr test` instead; see [Run tests with mcr test](/getting-started/node-test-runner#run-tests-with-mcr-test).

## [AVA](https://github.com/avajs/ava) {#ava}
```sh
mcr ava
```

For Node.js unit and integration tests, we recommend using `mcr test` instead; see [Run tests with mcr test](/getting-started/node-test-runner#run-tests-with-mcr-test).

---

<small>Note: Replacing a test runner with `mcr test` means migrating to `node:test`, not just changing the command; test APIs, assertions and hooks may need adapting.</small>
