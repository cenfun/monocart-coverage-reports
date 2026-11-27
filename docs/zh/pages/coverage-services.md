# 覆盖率服务 {#coverage-services}

<span id="覆盖率服务"></span>

可以在 GitHub Actions 中展示覆盖率，也可以生成覆盖率服务支持的格式后上传。下面的步骤假设 `outputDir` 为 `./coverage-reports`；`lcov: true` 会额外输出 `lcov.info`。如果测试分片各自生成报告，请先决定是[在 MCR 中合并](/zh/pages/merging#manual-merging)，还是[交给覆盖率服务合并](/zh/pages/merging#coverage-services)。

## GitHub Actions {#github-actions}

### 作业摘要 {#job-summary}

使用 [`markdown-summary`](/zh/pages/reports#markdown-summary) 生成总体覆盖率，使用 [`markdown-details`](/zh/pages/reports#markdown-details) 生成逐文件覆盖率。将生成的文件追加到 `$GITHUB_STEP_SUMMARY`，即可在工作流运行的 **Summary（摘要）** 页面查看表格，无需 PR 写权限。

如果 Node.js 项目使用 [`mcr test`](/zh/pages/node-test-runner#quick-start)，请在安装依赖（包括 MCR）后添加以下步骤：

```yaml
- name: Run tests and generate coverage
  run: npx mcr test "./test/**/*.test.js" -r markdown-summary,markdown-details -o ./coverage-reports

- name: Add coverage to the job summary
  run: |
    {
      cat ./coverage-reports/coverage-summary.md
      printf '\n\n'
      cat ./coverage-reports/coverage-details.md
    } >> "$GITHUB_STEP_SUMMARY"
```

如果使用其他测试运行器，在现有覆盖率步骤中生成同样的报告，再用相同方式追加到作业摘要。

### PR 评论 {#github-pr-comments}

使用 [`markdown-summary`](/zh/pages/reports#markdown-summary) 或 [`markdown-details`](/zh/pages/reports#markdown-details) 生成覆盖率表格，再由 CI 发布到 PR。如需在评论中加入基准分支与 PR 的对比：

1. 用相同的覆盖率配置为基准提交和 PR 提交分别生成 [`json-summary`](/zh/pages/reports#json-summary)。用 PR 的覆盖率减去基准覆盖率，得到百分点变化。
2. 将 Git diff 中新增和修改的行与 PR 的 [`lcovonly`](/zh/pages/reports#lcovonly) 报告匹配。用已覆盖的变更行数除以可统计覆盖率的变更行数，得到徽章上的百分比；没有可统计的变更行时，显示 `N/A`。
3. 将结果整理为 Markdown，在有 PR 写权限的 CI 步骤中，通过 [GitHub API 发布或更新 PR 评论](https://docs.github.com/zh/rest/issues/comments#create-an-issue-comment)。

MCR 本身不比较提交，也不发表评论。如果希望使用托管集成，可以查看所用覆盖率服务是否提供 PR 评论和变更行覆盖率。

## [Codecov](https://about.codecov.io/) {#codecov}
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
使用内置的 [`codecov` 报告](/zh/pages/reports#codecov)生成 `codecov.json`。
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
