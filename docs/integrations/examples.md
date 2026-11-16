# Frameworks and CI services {#integration-examples}

## [Playwright](https://github.com/microsoft/playwright) {#playwright}
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
- see [Collecting V8 Coverage Data with Playwright](/integrations/playwright#collecting-v8-coverage-data-with-playwright)

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

## [Puppeteer](https://github.com/puppeteer/puppeteer/) {#puppeteer}
- [jest-puppeteer-coverage](https://github.com/cenfun/jest-puppeteer-coverage) - Example for Jest puppeteer coverage
- [maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js) - Example for Jest (unit) + Puppeteer (e2e) + Codecov
- see [Collecting Raw V8 Coverage Data with Puppeteer](/integrations/puppeteer#collecting-raw-v8-coverage-data-with-puppeteer)

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

## [Codecov](https://codecov.com/) {#codecov}
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
- Supports native `codecov` built-in report ([specification](https://docs.codecov.com/docs/codecov-custom-coverage-format))
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        ['codecov']
    ]
};
```
- Github actions:
```yml
- name: Codecov
    uses: codecov/codecov-action@v4
    with:
        token: ${{ secrets.CODECOV_TOKEN }}
        files: ./coverage-reports/codecov.json
```

## [Codacy](https://www.codacy.com/) {#codacy}
[![Codacy](https://app.codacy.com/project/badge/Coverage/715016ea8e90479db875b777db8bad55)](https://app.codacy.com/gh/cenfun/monocart-coverage-reports/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
- Using `lcov` report:
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
- Github actions:
```yml
- name: Codacy Coverage Reporter
    uses: codacy/codacy-coverage-reporter-action@v1
    with:
        project-token: ${{ secrets.CODACY_PROJECT_TOKEN }}
        coverage-reports: ./coverage-reports/lcov.info
```

## [Coveralls](https://coveralls.io/) {#coveralls}
[![Coverage Status](https://coveralls.io/repos/github/cenfun/monocart-coverage-reports/badge.svg?branch=main)](https://coveralls.io/github/cenfun/monocart-coverage-reports?branch=main)
- Using `lcov` report:
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
- Github actions:
```yml
- name: Coveralls
    uses: coverallsapp/github-action@v2
    with:
        files: ./coverage-reports/lcov.info
```

## [Sonar Cloud](https://sonarcloud.io/) {#sonar-cloud}
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=monocart-coverage-reports&metric=coverage)](https://sonarcloud.io/summary/new_code?id=monocart-coverage-reports)
- Using `lcov` report. Github actions example:
```yml
- name: Analyze with SonarCloud
    uses: sonarsource/sonarcloud-github-action@master
    env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    with:
        projectBaseDir: ./
        args: >
        -Dsonar.organization=cenfun
        -Dsonar.projectKey=monocart-coverage-reports
        -Dsonar.projectName=monocart-coverage-reports
        -Dsonar.javascript.lcov.reportPaths=coverage-reports/lcov.info
        -Dsonar.sources=lib
        -Dsonar.tests=test
        -Dsonar.exclusions=dist/*,packages/*
```
