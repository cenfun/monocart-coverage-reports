# Integrate with your framework {#integrate-with-your-framework}

MCR can integrate with your existing testing framework through the CLI or API, without replacing your test runner or changing how you write tests. Choose the approach that fits your workflow.

## CLI {#cli}

For Node.js test commands, prefix your existing command with `mcr` to collect V8 coverage and generate reports:

```sh
mcr your-cli --your-arguments
```

See [Command line](/reference/cli#command-line) for options. For browser tests, use the framework's coverage collection API and pass the collected data to MCR as described below.

## API {#api}

Collect coverage data in your test hooks or fixtures, then add it to an MCR report instance ([`CoverageReport`](/reference/types#coveragereport)) with `await mcr.add(coverageData)`. After all tests finish, call `await mcr.generate()` to generate the reports.

This approach gives you control over when coverage is collected and submitted. See [V8 collection](/coverage-collection/v8), [Istanbul collection](/coverage-collection/istanbul), and [Multiple processes](/reference/multiprocessing#multiple-processes) for collection and cross-process integration details.
