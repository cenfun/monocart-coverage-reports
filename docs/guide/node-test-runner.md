# Run tests with mcr test {#run-tests-with-mcr-test}

**New in MCR 3.x:** Run tests with the built-in [Node.js test runner](https://nodejs.org/docs/latest/api/test.html) and automatically generate coverage reports with one command. Requires **Node.js >= 22.15.0**.

Install MCR and run your test files directly — no config file is required:

```sh
npm i monocart-coverage-reports -D
npx mcr test "./test/**/*.test.js" -r v8,console-summary -o ./coverage-reports
```

This runs the matching tests, prints a coverage summary in the terminal, and writes the V8 HTML report to `./coverage-reports/index.html`. Quote glob patterns so Node.js, rather than your shell, handles matching.

For repeated runs, save the test targets and coverage options in `mcr.config.js` (ESM; use `"type": "module"` in `package.json`, or name the config `mcr.config.mjs`):

```js
export default {
    test: ['./test/unit/**/*.test.js', './test/integration/**/*.test.js'],
    reports: ['v8', 'console-summary'],
    outputDir: './coverage-reports'
};
```

```sh
# Run the targets from the config
npx mcr test
# Override the configured targets and forward Node.js test runner options after --
npx mcr test "./test/unit/**/*.test.js" -- --test-reporter=spec

# Use an explicit config file
npx mcr test "../tests/**/*.test.js" -c ./mcr.config.js

# Choose reports from the command line
npx mcr test "../tests/**/*.test.js" -r v8,console-summary

# Run multiple test files
npx mcr test ./test/first.test.js ./test/second.test.js

# Filter test names and select a reporter
npx mcr test "../tests/**/*.test.js" -c ./mcr.config.js -- --test-name-pattern="my test" --test-reporter=spec

# Place the test command after an initial separator
npx mcr -c ./mcr.config.js -- test "../tests/**/*.test.js" -- --test-reporter=spec
```

Positional targets override (rather than append to) the config `test` option. If no positional targets are given, the config option is used. A config file is not required when targets are supplied on the command line. Existing MCR options such as `-c`, `-r`, `-o` and `--lcov` can appear before or after targets. Put Node runner options after `--`; those arguments are forwarded unchanged, not parsed as MCR options or target overrides. Quote globs to prevent shell expansion. In the alternative `mcr [options] -- test ...` form, put all MCR options before the first `--`; a second `--` separates Node runner options.

Targets are passed unchanged to `node --test`. MCR does not check their types or filesystem existence, expand directories/globs, resolve or normalize paths, escape special characters, or deduplicate targets. `node --test` accepts positional test file paths or glob patterns, not a JavaScript configuration object. In MCR config, a string represents one such argument (it is not split on spaces), and a string array represents multiple arguments forwarded in their original order. `null` is only MCR's skip default and is never passed to Node. Node handles discovery, matching, interpretation and errors. Relative paths use the current working directory, not the config file directory. A bare directory is not promised to trigger recursive discovery; use a glob such as `"../tests/**/*.test.js"` for recursive matching, following the installed Node version's native behavior. TypeScript execution depends on your Node version or a loader such as `--import tsx`.

`test` defaults to `null`; when no positional targets are supplied, `null`, an omitted value, an empty string or `[]` skips tests without generating a report. MCR only checks whether targets were supplied; invalid or unmatched targets are left to Node. If no coverage data is produced and no report can be generated, the command fails at report generation. Missing explicit config files and failed config loading also fail the command rather than silently skipping tests. Test failures still produce coverage reports and retain a non-zero exit status; report generation failures also fail the command. Existing coverage options and CLI hooks are supported. Use coverage filters to exclude test files if needed. **The `test` option has no effect on other CLI commands or API calls**, including `merge` and `generate()`.

See [Command Line](/reference/cli#command-line) for other CLI options.
