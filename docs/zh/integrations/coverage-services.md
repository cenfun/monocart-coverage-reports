# 覆盖率服务 {#coverage-services}

<span id="覆盖率服务"></span>

先在 CI 中运行测试并生成服务能读取的报告，再上传对应文件。下面的步骤假设 `outputDir` 为 `./coverage-reports`；`lcov: true` 会额外输出 `lcov.info`。如果测试分片各自生成报告，请先决定是[在 MCR 中合并](/zh/reference/merging#manual-merging)，还是[交给覆盖率服务合并](/zh/reference/merging#coverage-services)。

## [Codecov](https://about.codecov.io/) {#codecov}
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
使用内置的 [`codecov` 报告](/zh/reference/reports#codecov)生成 `codecov.json`。
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    reports: [
        ['codecov']
    ]
};
```
GitHub Actions 上传步骤：
```yml
- name: Codecov
  uses: codecov/codecov-action@v7
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage-reports/codecov.json
    disable_search: true
    fail_ci_if_error: true
```

`disable_search` 确保只上传指定的文件；`fail_ci_if_error` 让上传失败时 CI 报错。如果不想保存上传 token，可按 [Codecov Action 文档](https://github.com/codecov/codecov-action#using-oidc)配置 OIDC。

## [Codacy](https://www.codacy.com/) {#codacy}
[![Codacy](https://app.codacy.com/project/badge/Coverage/715016ea8e90479db875b777db8bad55)](https://app.codacy.com/gh/cenfun/monocart-coverage-reports/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_coverage)
使用 LCOV 报告：
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
GitHub Actions 上传步骤：
```yml
- name: Codacy Coverage Reporter
  uses: codacy/codacy-coverage-reporter-action@v1
  with:
    project-token: ${{ secrets.CODACY_PROJECT_TOKEN }}
    coverage-reports: ./coverage-reports/lcov.info
```

## [Coveralls](https://coveralls.io/) {#coveralls}
[![Coverage Status](https://coveralls.io/repos/github/cenfun/monocart-coverage-reports/badge.svg?branch=main)](https://coveralls.io/github/cenfun/monocart-coverage-reports?branch=main)
使用 LCOV 报告：
```js
const coverageOptions = {
    outputDir: './coverage-reports',
    lcov: true
};
```
GitHub Actions 上传步骤：
```yml
- name: Coveralls
  uses: coverallsapp/github-action@v2
  with:
    file: ./coverage-reports/lcov.info
    format: lcov
```

如果每个分片分别上传，请按 [Coveralls Action 文档](https://github.com/coverallsapp/github-action)配置 `parallel`，并在所有分片完成后发送 `parallel-finished`。

## [SonarQube Cloud](https://www.sonarsource.com/products/sonarqube/cloud/) {#sonar-cloud}
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=monocart-coverage-reports&metric=coverage)](https://sonarcloud.io/summary/new_code?id=monocart-coverage-reports)
覆盖率需要 **CI 分析**，不支持自动分析；如果项目开启了自动分析，请先关闭。检出代码时为 `actions/checkout` 设置 `fetch-depth: 0`，并在扫描前生成 `lcov.info`。请替换示例中的组织、项目键和目录，参见[官方 LCOV 配置说明](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/javascript-typescript-test-coverage)。
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
