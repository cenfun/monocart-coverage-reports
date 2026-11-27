# Command line {#command-line}

> The CLI will run the program as a [child process](https://nodejs.org/docs/latest/api/child_process.html) with `NODE_V8_COVERAGE=dir` until it exits gracefully, and generate the coverage report with the coverage data from the `dir`.

## Installation {#installation}

### Global installation {#global-installation}

```sh
npm i monocart-coverage-reports -g
mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

### Local installation {#local-installation}

```sh
npm i monocart-coverage-reports
npx mcr node ./test/specs/node.test.js -r v8,console-details --lcov
```

## Command execution {#command-execution}

```sh
mcr node demo.js
```

Pass the executable and its arguments separately: `node` is the executable and `demo.js` is its argument. MCR runs the command without enabling shell mode, then generates a coverage report after it exits. Use [`--`](#separate-child-arguments) to keep child options separate from MCR options.

## CLI options {#cli-options}

The table lists the flags accepted by `mcr` itself. Where applicable, defaults can be overridden in a configuration file.

| Flag | Default | Description |
| :-- | :-- | :-- |
| `-v, --version` | — | Print the current version and exit. |
| `-c, --config <path>` | — | Use an explicit configuration file; see [Configuration files](/pages/configuration#configuration-files). |
| `-l, --logging <level>` | `info` | Set the [logging level](/pages/options#logging): `off`, `error`, `info`, or `debug`. |
| `-n, --name <name>` | `Coverage Report` | Set the [report title](/pages/options#name). |
| `-r, --reports <name[,name]>` | Auto | Choose [reports](/pages/options#reports) by name, separated by commas. |
| `-o, --outputDir <dir>` | `./coverage-reports` | Set the [report output directory](/pages/options#outputdir). |
| `-i, --inputDir <dir[,dir]>` | — | Set the [raw coverage inputs](/pages/options#inputdir) for merging, separated by commas. |
| `-b, --baseDir <dir>` | `process.cwd()` | Set the [base directory](/pages/options#basedir) for normalizing source paths. |
| `-a, --all <dir[,dir]>` | — | Include [untested files](/pages/options#all) from one or more comma-separated directories. |
| `--entryFilter <pattern>` | — | Filter [V8 entry URLs](/pages/options#entryfilter) by pattern. |
| `--sourceFilter <pattern>` | — | Filter [sources from sourcemaps](/pages/options#sourcefilter) by pattern. |
| `--outputFilter <pattern>` | — | Filter [final source paths](/pages/options#outputfilter) by pattern. |
| `--filter <pattern>` | — | Set a [fallback pattern](/pages/options#filter) for entry and source filtering. Each specific filter takes precedence when set. |
| `--outputFile <path>` | `index.html` | Set the [V8 HTML report path](/pages/options#outputfile) relative to the output directory. |
| `--inline` | `false` | [Inline assets](/pages/options#inline) into the V8 HTML report. |
| `--assetsPath <path>` | `./assets` | Set the [V8 report assets path](/pages/options#assetspath) when assets are not inlined. |
| `--lcov` | `false` | Also generate [`lcov.info`](/pages/options#lcov). |
| `--import <module>` | — | [Preload an ESM module](#preload-modules), such as `tsx`, via `NODE_OPTIONS`. |
| `--require <module>` | — | Deprecated alias for `--import`; uses ESM resolution. |
| `--env [path]` | — | [Load environment variables](#environment-variables) from a dotenv file. Uses `.env` if the flag is given without a path. |
| `-h, --help` | — | Print CLI help and exit. |

`--import`, `--require`, and `--env` apply to commands that launch a child process (including `mcr test`). `mcr merge` ignores these flags.

For settings that are not command-line flags, including `test` and hooks, see [Configuration options](/pages/options#configuration-options).

### Separate child arguments {#separate-child-arguments}

Use `--` to separate sub CLI args:
```sh
mcr -c mcr.config.js -- sub-cli -c sub-cli.config.js
```

### Preload modules {#preload-modules}

`--import <module>` / `--require <module>`: forward a preload module to the child process via `NODE_OPTIONS`. Use this to preload a runtime such as `tsx`, including for configuration syntax beyond native stripping. For `ts-node` with ESM, see [External loaders](/pages/typescript#ts-node). Erasable `mcr.config.ts` files do not need a loader. Available on all supported Node.js versions. Local paths are relative to the current working directory and must include the file extension; paths containing spaces are supported. Package names use native ESM resolution from MCR's module location. Both flags use `import()` and forward `--import` to Node; `--require` is a deprecated alias, not a CommonJS loader. CJS modules work only through Node's built-in import interoperability.
```sh
mcr --import tsx node ./test.ts
```

### Environment variables {#environment-variables}

`--env [path]`: load environment variables from a dotenv file before the child starts (defaults to `.env`). Uses `process.loadEnvFile`, available on all supported Node.js versions.
```sh
mcr --env .env.test node ./test.js
```

## Built-in commands {#built-in-commands}

| Command | Description |
| :-- | :-- |
| [`mcr merge`](#merge-coverage) | Merge raw coverage data and generate reports without starting a child process. |
| [`mcr test`](#run-tests) | Run Node.js tests and generate coverage reports. |

### `mcr merge` {#merge-coverage}

Merge raw coverage data from the `--inputDir` paths and generate reports without starting a child process.

```sh
mcr merge -r v8,console-details --inputDir ./coverage-reports/unit/raw,./coverage-reports/e2e/raw --outputDir ./coverage-reports/merged
```
See [Merge Coverage Reports](/pages/merging#merging-reports).

### `mcr test` {#run-tests}

Run Node.js tests and generate coverage reports.

```sh
mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
```

For more usage examples, see [Run tests with `mcr test`](/pages/node-test-runner#run-tests-with-mcr-test).

## Examples {#examples}

- [Run Node.js tests with `mcr test`](/pages/node-test-runner#run-tests-with-mcr-test)
- [TypeScript support](/pages/typescript#typescript-support)
- [Run `mcr` with a configuration file](/pages/configuration#minimal-config)
