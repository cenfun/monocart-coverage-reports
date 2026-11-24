# Integrate with your framework {#integrate-with-your-framework}

You can keep your existing test runner. Use the CLI to collect coverage from a Node.js command, or the API to import data from browser tests or a runner that already collects coverage. If you already use `node:test`, use [`mcr test`](/getting-started/node-test-runner#quick-start). Check [framework-specific integrations](/integrations/frameworks-and-tools) before wiring it up yourself.

## CLI {#cli}

For Node.js test commands, prefix your existing command with `mcr` to collect V8 coverage and generate reports:

```sh
npx mcr -- your-test-runner --your-arguments
```

See [Command line](/reference/cli#command-line) for options. For browser tests, use the framework's coverage collection API and pass the collected data to MCR as described below.

## API {#api}

Collect coverage data in your test hooks or fixtures, then add it to an MCR report instance ([`CoverageReport`](/reference/types#coveragereport)) with `await mcr.add(coverageData)`. After all tests finish, call `await mcr.generate()` to generate the reports.

This approach gives you control over when coverage is collected and submitted. See [V8 collection](/coverage-collection/v8), [Istanbul collection](/coverage-collection/istanbul), and [Multiple processes](/reference/multiprocessing#multiple-processes) for collection and cross-process integration details.
