# Configuration files {#configuration-files}

## Minimal config {#minimal-config}

Create `mcr.config.js` in your project root. This example uses ESM exports; for CommonJS configuration, see [Module format](#module-format):

```js
export default {
    name: 'My Coverage Report',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-summary']
};
```

Then run from the project root (replace `demo.js` with your script, or use the [quick-start example](/getting-started/get-started#first-report)):

```sh
npx mcr node demo.js
```

The CLI discovers config files automatically. See [Configuration options](/reference/options#configuration-options) for all fields and [Reports](/reference/reports#reports) for output formats.

## Module format {#module-format}

MCR supports both ESM and CommonJS configuration. Use `export default` for ESM (for example, `.js` files with `"type": "module"` in `package.json`), or `module.exports` for CommonJS (for example, `.cjs` files, or `.js` files with `"type": "commonjs"`).

MCR being ESM-only does not change the module format of your project's `.js` files. CommonJS scripts can load MCR with asynchronous `import()` without converting the whole project to ESM; see the [migration guide](/migrations/migration-to-3).

## Load config with the API {#api}

With the API, load config explicitly before adding data:

```js
import { CoverageReport } from 'monocart-coverage-reports';

const mcr = new CoverageReport();
await mcr.loadConfig();
```

Then add data and generate reports as shown in the [report API example](/getting-started/get-started#api). `MCR({...})` is a shorthand factory for [`new CoverageReport({...})`](/reference/types#coveragereport).

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
- `mcr.config.ts` — loads natively on recent Node.js when it uses erasable TypeScript syntax; no `tsx` preload is needed. See [TypeScript support](/reference/typescript#typescript-support).
```sh
mcr -c mcr.config.ts node ./test.ts
# For projects that require a separate TypeScript runtime:
mcr --import tsx -c mcr.config.ts node ./test.ts
```

> If no custom path is given, MCR walks up from the current working directory to find the default config file (via [`find-up`](https://github.com/sindresorhus/find-up)). Files outside the search path will be ignored.
