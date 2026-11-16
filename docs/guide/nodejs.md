# Node.js collection {#collecting-v8-coverage-data-from-nodejs}
Possible solutions:
- [NODE_V8_COVERAGE](https://nodejs.org/docs/latest/api/cli.html#node_v8_coveragedir)=`dir`
    - Sets Node.js env `NODE_V8_COVERAGE`=`dir` before the program running, the coverage data will be saved to the `dir` after the program exits gracefully.
    - Read the JSON file(s) from the `dir` and generate coverage report.
    - Example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-env` node [./test/test-node-env.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-env.js) && node [./test/generate-report.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/generate-report.js)

- [V8](https://nodejs.org/docs/latest/api/v8.html#v8takecoverage) API + NODE_V8_COVERAGE
    - Writing the coverage started by NODE_V8_COVERAGE to disk on demand with `v8.takeCoverage()`, it does not require waiting until the program exits gracefully.
    - Example:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-api` node [./test/test-node-api.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-api.js)

- [Inspector](https://nodejs.org/docs/latest/api/inspector.html) API
   - Connecting to the V8 inspector and enable V8 coverage.
   - Taking coverage data and adding it to the report.
   - Example:
   > node [./test/test-node-ins.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-ins.js)
   - vm Example (scriptOffset):
   > node [./test/test-node-vm.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-vm.js)

- [CDP](https://chromedevtools.github.io/devtools-protocol/) API
    - Enabling [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started/).
    - Collecting coverage data with CDP API.
    - Example:
    > node --inspect=9229 [./test/test-node-cdp.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-cdp.js)

- [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started) + CDP + NODE_V8_COVERAGE + V8 API
    - When the program starts a server, it will not exit on its own, thus requiring a manual invocation of the `v8.takeCoverage()` interface to manually collect coverage data. Remote invocation of the `v8.takeCoverage()` interface can be accomplished through the `Runtime.evaluate` of the CDP.
    - Example for [koa](https://github.com/koajs/koa) web server:
    > node [./test/test-node-koa.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-koa.js)

- [Child Process](https://nodejs.org/docs/latest/api/child_process.html) + NODE_V8_COVERAGE
    - see [Command Line](/reference/cli#command-line)
