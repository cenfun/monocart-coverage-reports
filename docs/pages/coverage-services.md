# Coverage services {#coverage-services}

Publish coverage in GitHub Actions or generate a report in a format your coverage service accepts. These steps assume `outputDir` is `./coverage-reports`; `lcov: true` also writes `lcov.info`. For sharded tests, decide whether to [merge in MCR](/pages/merging#manual-merging) or [let your service merge the uploads](/pages/merging#coverage-services).

## GitHub Actions {#github-actions}

### Job summary {#job-summary}

Add [`markdown-summary`](/pages/reports#markdown-summary) for overall coverage and [`markdown-details`](/pages/reports#markdown-details) for per-file coverage. Append the generated files to `$GITHUB_STEP_SUMMARY` to show the tables on the workflow run's **Summary** page. This does not require write access to pull requests.

For a Node.js project using [`mcr test`](/pages/node-test-runner#quick-start), add these steps after installing dependencies (including MCR):

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

If you use another test runner, generate the same reports in your existing coverage step, then append them in the same way.

### Pull request comments {#github-pr-comments}

Use [`markdown-summary`](/pages/reports#markdown-summary) or [`markdown-details`](/pages/reports#markdown-details) to generate tables that your CI can post to a pull request. To add a base-vs-PR comparison:

1. Generate [`json-summary`](/pages/reports#json-summary) for the base and PR commits with the same coverage configuration. Subtract the base percentage from the PR percentage to get the change in percentage points.
2. For the changed-lines badge, match added and modified lines in the Git diff against the PR’s [`lcovonly`](/pages/reports#lcovonly) report. Divide covered changed lines by coverable changed lines. If there are no coverable changed lines, show `N/A`.
3. Format the results as Markdown and [post or update a PR comment with the GitHub API](https://docs.github.com/en/rest/issues/comments#create-an-issue-comment) from a CI step with write access to the pull request.

MCR does not compare commits or post comments itself. If you prefer a managed integration, check whether your coverage service offers PR comments and changed-line coverage.

## [Codecov](https://about.codecov.io/) {#codecov}
[![codecov](https://codecov.io/gh/cenfun/monocart-coverage-reports/graph/badge.svg?token=H0LW7UKYU3)](https://codecov.io/gh/cenfun/monocart-coverage-reports)
Use the built-in [`codecov` report](/pages/reports#codecov) to generate `codecov.json`.
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
