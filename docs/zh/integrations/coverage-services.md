# 覆盖率服务

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
