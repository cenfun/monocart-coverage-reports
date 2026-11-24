# Coverage services {#coverage-services}

Run tests and generate a report in a format your service accepts before uploading it. These steps assume `outputDir` is `./coverage-reports`; `lcov: true` also writes `lcov.info`. For sharded tests, decide whether to [merge in MCR](/reference/merging#manual-merging) or [let your service merge the uploads](/reference/merging#coverage-services).

## [Codecov](https://about.codecov.io/) {#codecov}
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
Use the built-in [`codecov` report](/reference/reports#codecov) to generate `codecov.json`.
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        ['codecov']
    ]
};
```
GitHub Actions upload step:
```yml
- name: Codecov
  uses: codecov/codecov-action@v7
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage-reports/codecov.json
    disable_search: true
    fail_ci_if_error: true
```

`disable_search` limits the upload to the named file, and `fail_ci_if_error` makes upload errors fail CI. To avoid storing an upload token, see the [Codecov Action instructions for OIDC](https://github.com/codecov/codecov-action#using-oidc).

## [Codacy](https://www.codacy.com/) {#codacy}
[![Codacy](https://app.codacy.com/project/badge/Coverage/715016ea8e90479db875b777db8bad55)](https://app.codacy.com/gh/cenfun/monocart-coverage-reports/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
Generate an LCOV report:
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
GitHub Actions upload step:
```yml
- name: Codacy Coverage Reporter
  uses: codacy/codacy-coverage-reporter-action@v1
  with:
    project-token: ${{ secrets.CODACY_PROJECT_TOKEN }}
    coverage-reports: ./coverage-reports/lcov.info
```

## [Coveralls](https://coveralls.io/) {#coveralls}
[![Coverage Status](https://coveralls.io/repos/github/cenfun/monocart-coverage-reports/badge.svg?branch=main)](https://coveralls.io/github/cenfun/monocart-coverage-reports?branch=main)
Generate an LCOV report:
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
GitHub Actions upload step:
```yml
- name: Coveralls
  uses: coverallsapp/github-action@v2
  with:
    file: ./coverage-reports/lcov.info
    format: lcov
```

If each shard uploads separately, follow the [Coveralls Action instructions](https://github.com/coverallsapp/github-action) for `parallel` and send `parallel-finished` after all shards complete.

## [SonarQube Cloud](https://www.sonarsource.com/products/sonarqube/cloud/) {#sonar-cloud}
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=monocart-coverage-reports&metric=coverage)](https://sonarcloud.io/summary/new_code?id=monocart-coverage-reports)
Coverage requires **CI-based analysis**. Disable automatic analysis if it is enabled. Set `fetch-depth: 0` in your `actions/checkout` step and generate `lcov.info` before scanning. Replace the organization, project key, and directories with your own. See the [official LCOV configuration guide](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/javascript-typescript-test-coverage).
```yml
- name: Analyze with SonarQube Cloud
  uses: SonarSource/sonarqube-scan-action@v8
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  with:
    projectBaseDir: ./
    args: >
      -Dsonar.organization=your-organization
      -Dsonar.projectKey=your-project-key
      -Dsonar.javascript.lcov.reportPaths=coverage-reports/lcov.info
      -Dsonar.sources=lib
      -Dsonar.tests=test
```
