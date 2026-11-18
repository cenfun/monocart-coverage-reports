# Configuration files {#configuration-files}

## Loading behavior {#loading-behavior}

In MCR 3.x, [`loadConfig()`](/reference/types#coveragereport) throws if an explicitly requested config does not exist or a discovered config fails to load (including JSON parsing, module syntax and startup errors). All CLI commands exit with a non-zero status for these errors. No `strict` option is needed. If no custom config is requested and no default config is found, execution continues with existing options.

## Configuration types {#configuration-types}

Configuration types: [`CoverageReportOptions`](/reference/types#coveragereportoptions) for the API, or [`McrCliOptions`](/reference/types#mcrclioptions) for CLI and test runner options.

## Loading priority {#loading-priority}

Loading config file by priority:
- Custom config file:
    - CLI: `mcr --config <my-config-file-path>`
    - API: `await mcr.loadConfig("my-config-file-path")`
- `mcr.config.js`
- `mcr.config.cjs`
- `mcr.config.mjs`
- `mcr.config.json` - json format
- `mcr.config.ts` (requires preloading the TypeScript execution module, for example with `tsx`):
```sh
mcr --import tsx -c mcr.config.ts node ./test.js
```

> If no custom path is given, MCR walks up from the current working directory to find the default config file (via [`find-up`](https://github.com/sindresorhus/find-up)). Files outside the search path will be ignored.
