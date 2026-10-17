## Changelog

- 3.0.0
  - **Breaking Changes**
    - require Node.js >= 22.15.0
    - migrate to ESM only; replace the callable `require('monocart-coverage-reports')` entry with default/named imports, or dynamic `import()` from CommonJS
    - use `export default` in ESM config files; rename existing CommonJS configs to `.cjs` (still supported)
    - `loadConfig()` throws on missing explicit configs or loading errors
    - replace `foreground-child` with `execa` for CLI command execution, preserving argument boundaries without enabling shell mode; shell command strings, pipes and redirections are no longer interpreted by MCR
    - apply a default 30000ms total deadline to HTTP helper requests; `timeout` covers both response headers and body transfer, and `0` disables the deadline
  - **Features**
    - use synchronous `module.registerHooks()` for source capture, including CommonJS modules loaded through `require()` and `createRequire()`
    - add `outputFilter` to filter final V8 results by `sourcePath`, including converted Istanbul reports (#132)
    - add `mcr test` with the native Node.js test runner and automatic coverage reports
    - support config/CLI test targets and Node runner arguments after `--`
    - add configurable CDP command timeouts (`requestTimeout`, default 30000ms; `0` disables the deadline)
  - **Bug Fixes**
    - generate coverage after failed tests and preserve test/report failure exit codes
    - preserve config error details and original causes, including non-Error throws
    - propagate concurrency task failures and drain in-flight work before queue cleanup
    - settle HTTP requests on timeout, cancellation or premature response closure and release their connections
    - retry localhost requests through IPv4 only on connection refusal, not on HTTP errors, JSON parsing failures, timeouts or cancellation
    - reject pending WebSocket commands on disconnect or detach, clean up request timers, and propagate CDP protocol errors
    - terminate stalled CDP WebSocket handshakes and apply the connection timeout to HTTP debugger discovery
  - **Performance**
    - defer untested source reads until after filtering when source-path callbacks do not need the source
    - avoid intermediate arrays when finding enclosing covered blocks
    - initialize GC only on demand without installing host globals, and skip unnecessary memory sampling
  - **Maintenance**
    - remove obsolete Node.js version checks from test builds

For 2.x and 1.x changelogs, see [GitHub Releases](https://github.com/cenfun/monocart-coverage-reports/releases).
