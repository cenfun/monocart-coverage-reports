# 框架与工具 {#integration-examples}

## [c8](https://github.com/bcoe/c8) {#c8}
- c8 has integrated `MCR` as an experimental feature since [v10.1.0](https://github.com/bcoe/c8/releases/tag/v10.1.0)
```sh
c8 --experimental-monocart --reporter=v8 --reporter=console-details node foo.js
```

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

## [Node Test Runner](https://nodejs.org/docs/latest/api/test.html) {#node-test-runner}
- [node-monocart-coverage](https://github.com/cenfun/node-monocart-coverage) - Custom reporter for Node test runner for coverage

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

## [Mocha](https://github.com/mochajs/mocha) {#mocha}
```sh
mcr mocha ./test/**/*.js
```

## [TypeScript](https://github.com/microsoft/typescript) {#typescript}

- [tsx](https://github.com/privatenumber/tsx)
```sh
cross-env NODE_OPTIONS="--import tsx" npx mcr tsx ./src/example.ts
cross-env NODE_OPTIONS="--import tsx" npx mcr mocha ./test/**/*.ts
# MCR 3.x: Node.js >= 22.15.0
mcr --import tsx tsx ./src/example.ts
mcr --import tsx mocha ./test/**/*.ts
```
- [ts-node](https://github.com/TypeStrong/ts-node)
```sh
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr ts-node ./src/example.ts
cross-env NODE_OPTIONS="--loader ts-node/esm --no-warnings" npx mcr mocha ./test/**/*.ts
```


## [AVA](https://github.com/avajs/ava) {#ava}
```sh
mcr ava
```
