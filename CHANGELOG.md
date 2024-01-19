## Changelog

* 2.2.0
    - (New Feature) supports `mcr` CLI

* 2.1.0 (Breaking Change) 
    - defaults to export `createCoverageReport` function instead of `CoverageReport` class
    ```diff
    - import CoverageReport, { createCoverageReport } from 'monocart-coverage-reports';
    + import createCoverageReport, { CoverageReport } from 'monocart-coverage-reports';
    ```
    - fixed format for `files` of coverage results
    - fixed types for commonjs

* 2.0.10
    - updated dependencies

* 2.0.9
    - fixed ignore for istanbul (#3)
    - fixed duplicate source file 
    - fixed UI issues

* 2.0.8
    - added new feature `v8 ignore next N/start/stop`

* 2.0.7
    - added `metrics` option for `v8` and `console-summary` report

* 2.0.6
    - added `console-summary` report

* 2.0.5
    - fixed AST parsing issue
    - fixed worker issue
    - updated formatter for worker issue

* 2.0.4
    - fixed source mapping issue

* 2.0.3
    - fixed branches count if no function ranges

* 2.0.2
    - fixed TypeError: Cannot read properties of undefined (reading 'startOffset')
    - updated css parser

* 2.0.0
    - added functions coverage for v8 (typescript)
    - added lines coverage for v8 (blanks, comments)
    - added node.js coverage test

* 1.1.0
    - added onEnd hook

* 1.0.9
    - added v8-json report

* 1.0.8
    - fixed module path for pnpm

* 1.0.7
    - fixed report path
    - added types for v8 options

* 1.0.6
    - fixed reading json file 

* 1.0.4
    - added reportPath option