## Changelog

* 2.5.3
    - fixed color issue for `console-details`
    - fixed file url

* 2.5.2
    - removed URL.canParse to support node 14

* 2.5.1
    - added new option `clean`

* 2.5.0
    - (New Feature) added new report `console-details`

* 2.4.4
    - fixed branch count
    - fixed function range for class method

* 2.4.3
    - fixed original offset if reversed

* 2.4.2
    - fixed default reports with lcov

* 2.4.1
    - fixed issue if uncovered in indent or ends with ";"
    - supports decorations for uncovered none else branches

* 2.4.0
    - (New Feature) added statements to report
    - optimized source mapping related codes

* 2.3.4
    - fixed ignore lines
    - fixed AssignmentPattern branches
    - added skip lines

* 2.3.3
    - supports c8 ignore
    - fixed ignore range

* 2.3.2
    - fixed issue for rmSync
    - fixed issue for AssignmentPattern
    - fixed url issue if entry url is a path 
    - added inputDir option for CLI

* 2.3.1
    - fixed issue for a source file fully uncovered

* 2.3.0
    - added new feature: custom reporter
    - added new reporter: raw
    - added new option: inputDir
    - added support for vm scriptOffset
    - fixed branches if exists in wrapper function
    - fixed performance for decoding source mappings
    - fixed branch locations range error

* 2.2.2
    - added codecov report

* 2.2.1
    - fixed anonymous url for linux

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