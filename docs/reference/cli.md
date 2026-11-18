# Command line {#command-line}
> The CLI will run the program as a [child process](https://nodejs.org/docs/latest/api/child_process.html) with `NODE_V8_COVERAGE=dir` until it exits gracefully, and generate the coverage report with the coverage data from the `dir`.

- Installing globally
```sh
npm i monocart-coverage-reports -g
mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

- Locally in your project
```sh
npm i monocart-coverage-reports
npx mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

- CLI Options

Commands are executed with Execa's default options, without enabling shell mode. Pass the executable and its arguments separately, for example `mcr node "./my app.js"`; do not quote an entire command as a single argument. Argument boundaries are preserved: MCR does not expand environment variables or globs, or interpret pipes, redirections, `&&` or other shell syntax. Move command sequences into a script instead. Use `mcr [options] -- executable ...args` to keep child options separate from MCR options. Execa handles platform-specific command execution, including escaped batch-file invocation through `cmd.exe` when needed on Windows.

The options below are only available when using the CLI (`mcr <command>`):

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `-c, --config` | `string` | — | Custom config file path |
| `--import` | `string` | `null` | Preload ESM module via `NODE_OPTIONS`, e.g. `tsx` for TypeScript. |
| `--require` | `string` | `null` | Deprecated alias for `--import`; uses ESM loading, not CommonJS resolution |
| `--env` | `string` | `null` | Load environment variables from a dotenv file (defaults to `.env`). |
| `test` (config only) | `string \| string[] \| null` | `null` | Default test file paths or glob patterns accepted by `node --test`, passed unchanged when `mcr test` has no positional targets; ignored by other commands and the API. Requires Node.js `>= 22.15.0` |
| `onTestEnd` (config only) | `(testResults) => void \| Promise<void>` | `null` | Only `mcr test`: runs after test result collection, before `onReady` and coverage generation; see [Hooks](/reference/hooks#hooks) |
| `onStart` | `(coverageReport) => Promise<void>` | `null` | Runs before the child process is spawned; see [Hooks](/reference/hooks#hooks) |
| `onReady` | `(coverageReport, nodeV8CoverageDir, subprocess) => Promise<void>` | `null` | Runs after the child exits, before MCR reads coverage; see [Hooks](/reference/hooks#hooks) |

For other options (e.g. `--name`, `--reports`, `--outputDir`, `--lcov`, etc.), see [Configuration options](/reference/options#configuration-options) — they work the same way in CLI.

- Use `--` to separate sub CLI args
```sh
mcr -c mcr.config.js -- sub-cli -c sub-cli.config.js
```

- `--import <module>` / `--require <module>`: forward a preload module to the child process via `NODE_OPTIONS`. Use this for TypeScript/JSX runtimes (`tsx`, `ts-node`, etc.) and also when loading a `mcr.config.ts`. Available on all supported Node.js versions. Local paths are relative to the current working directory and must include the file extension; paths containing spaces are supported. Package names use native ESM resolution from MCR's module location. Both flags use `import()` and forward `--import` to Node; `--require` is a deprecated alias, not a CommonJS loader. CJS modules work only through Node's built-in import interoperability.
```sh
mcr --import tsx node ./test.ts
```

- `--env [path]`: load environment variables from a dotenv file before the child starts (defaults to `.env`). Uses `process.loadEnvFile`, available on all supported Node.js versions.
```sh
mcr --env .env.test node ./test.js
```

- `test`: run Node.js tests and generate coverage reports. See [Run Tests with `mcr test`](/getting-started/node-test-runner#run-tests-with-mcr-test).

- `merge`: merge raw coverage data from `inputDir`(s) and generate merged reports directly, without running a child process.
```sh
mcr merge -r v8,console-details --inputDir ./coverage-reports/unit/raw,./coverage-reports/e2e/raw --outputDir ./coverage-reports/merged
```
See [Merge Coverage Reports](/reference/merging#merging-reports).

- Examples
    - [Mocha](/integrations/frameworks-and-tools#mocha)
    - [TypeScript](/integrations/frameworks-and-tools#typescript)
    - [AVA](/integrations/frameworks-and-tools#ava)
