# Migrating from MCR 2.x to 3.x

MCR 3.x keeps the core coverage APIs and report options, but introduces breaking changes in runtime requirements, module loading, CLI execution and error handling. Existing ESM integrations on a supported Node.js version usually need little work; CommonJS integrations and shell-based commands need review.

## 1. Upgrade Node.js first

All MCR APIs and CLI commands, including ordinary commands, `merge` and `test`, require **Node.js >= 22.15.0**. Node.js 18, 20 and versions of 22 earlier than 22.15.0 are no longer supported.

Check local development, CI jobs, Docker images and Node.js child processes that inherit MCR's preload through `NODE_OPTIONS`.

If you cannot upgrade Node.js, keep a verified compatible 2.x release **and its dependency lockfile**. Not every 2.x dependency combination supports older Node.js versions.

## 2. Replace the CommonJS entry

MCR is now ESM only. The old callable `require('monocart-coverage-reports')` entry is no longer provided.

Before:

```js
const MCR = require('monocart-coverage-reports');
const report = MCR({ outputDir: './coverage-reports' });
```

After, in an `.mjs` file or a project with `"type": "module"`:

```js
import MCR from 'monocart-coverage-reports';
// Alternatively: import { MCR, CoverageReport } from 'monocart-coverage-reports';

const report = MCR({ outputDir: './coverage-reports' });
```

The default `MCR` export retains properties such as `MCR.CoverageReport`, `MCR.CDPClient` and `MCR.Util`.

**You do not have to convert your entire project to ESM.** A CommonJS coverage script can use dynamic import inside an async function:

```js
// coverage.cjs
async function main() {
    const { MCR } = await import('monocart-coverage-reports');
    const report = MCR({ outputDir: './coverage-reports' });
    await report.addFromDir('./coverage-data');
    await report.generate();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

If a wrapper previously loaded MCR synchronously, dynamic import may require changing that wrapper's initialization API to be asynchronous.

CLI preloads also use native ESM loading. Prefer `--import`; `--require` is now a deprecated alias that uses the same `import()`/Node `--import` path, not CommonJS resolution or `require` export conditions. Local preload paths require explicit file extensions; package names resolve from MCR's module location. Require-only package exports must provide an import-compatible entry or be replaced with an explicit file path.

### TypeScript and secondary entry points

Replace `import MCR = require('monocart-coverage-reports')` with ESM imports. Check your module settings and emitted JavaScript so the build does not turn the import back into the old callable `require()` entry.

The `/util` and `/converter` entry points now expose **named exports only**:

```ts
import { Util } from 'monocart-coverage-reports/util';
import { convertV8List } from 'monocart-coverage-reports/converter';
import type { CoverageReportOptions } from 'monocart-coverage-reports';
```

## 3. Check configuration files

Both ESM and CommonJS configuration files remain supported:

```js
// mcr.config.mjs, or mcr.config.js in an ESM project
export default {
    reports: ['v8', 'console-summary']
};
```

```js
// mcr.config.cjs
module.exports = {
    reports: ['v8', 'console-summary']
};
```

MCR becoming ESM does **not** change how Node.js interprets `.js` files in your project. If you add `"type": "module"` to your project, convert existing `module.exports` configurations to ESM or rename them to `.cjs`. Update any explicit `--config` paths after renaming. Existing `.cjs` configs can stay as they are.

`loadConfig()` now throws when an explicitly requested config is missing or a discovered config fails to load, including syntax, JSON parsing and initialization errors. CLI commands also exit with a nonzero status in these cases. Fix invalid configuration rather than relying on the old log-and-continue behavior; API callers should await `loadConfig()` and handle failures at the appropriate boundary.

When no custom config is requested and no default config is found, MCR still continues with the existing options.

## 4. Pass CLI commands as executable and arguments

MCR now uses Execa without explicitly enabling shell mode. It preserves argument boundaries instead of joining arguments into a shell command string.

```sh
# Before: a whole command passed as one argument
mcr "node ./app.js"

# After
mcr node ./app.js
mcr node "./my app.js"

# Keep child-command options separate from MCR options
mcr -c mcr.config.cjs -- node ./app.js
```

MCR no longer interprets shell command strings, environment-variable expansion, globs, pipes, redirections or `&&`. Move composite commands into an npm script or a dedicated script, then run it through MCR:

```sh
mcr npm run coverage-target
```

This does not disable the outer terminal shell: a redirection typed directly into your terminal may still be handled by that shell before MCR receives the arguments. Review commands based on which layer previously interpreted them. Platform-specific executable handling, including Windows batch files, is handled by Execa.

Also check CI exit-code expectations. Failed child commands retain their failure status even when a hook resets `process.exitCode` to `0`; report generation failures also result in a nonzero exit status.

## 5. Review slow HTTP and CDP requests

- HTTP helper requests now have a default **30000ms total deadline**, covering both response headers and body transfer. This also affects remote sourcemap loading. For direct `Util.request()` calls, set `timeout` to a suitable value; `0` disables the deadline.
- `CDPClient({ timeout })` controls HTTP debugger discovery and WebSocket connection establishment; the default is **10000ms**.
- The new `CDPClient({ requestTimeout })` controls each CDP command on the built-in WebSocket session; the default is **30000ms**.
- Custom WebSocket sessions support `new MCR.WSSession(ws, { timeout: 60000 })`.
- Setting the corresponding timeout to `0` disables it. External Playwright/Puppeteer sessions manage their own command timeouts.

```js
const client = await MCR.CDPClient({
    port: 9229,
    timeout: 10000,
    requestTimeout: 60000
});
```

Pending WebSocket commands now reject on disconnect or detach, and CDP protocol errors propagate to callers. Ensure async coverage collection handles these failures rather than expecting requests to remain pending.

## 6. Keep existing coverage workflows

You do not need to rewrite calls to `MCR(options)`, `new CoverageReport()`, `add()`, `addFromDir()` or `generate()` solely for this upgrade.

Existing report and filter options remain available, including `reports`, `entryFilter`, `sourceFilter`, `filter`, `sourcePath` and `all`. The CLI can still cover CommonJS programs, and custom reporters can remain CommonJS when their file extension/package scope identifies them as such. All reporters use native ESM `import()` resolution. Local paths must include the file extension; CommonJS extension and directory fallbacks are not provided. Export reporter classes with `export default Reporter` in ESM. CJS `module.exports = Reporter` remains usable through Node's built-in import interoperability; no separate CJS loader is provided. Reporter loading and initialization failures now reject report generation, including V8/`both` reporters that previously logged the failure and continued.

### Update local reporter paths

Relative reporter file paths must start with `./` or `../` and include the file extension. They are resolved from the current working directory, not the config file directory. Absolute paths and `file:` URLs are also accepted.

```js
// Before: a local path without an explicit relative prefix
reports: [['test/custom-v8-reporter.js', { type: 'v8' }]]

// After
reports: [['./test/custom-v8-reporter.js', { type: 'v8' }]]
```

Names without a relative prefix, such as `test/custom-v8-reporter.js`, are treated as package specifiers, not local file paths. The old V8/`both` reporter fallback to a local file path has been removed; such paths may now fail with `ERR_MODULE_NOT_FOUND`. Actual package names can remain unchanged when their entry points support native ESM import resolution.

Custom reporter interfaces are unchanged: Istanbul reporters implement `execute(context)`, while V8 and `both` reporters implement `generate(reportData)`. The `both` type accepts results from either input format, distinguished by `reportData.type`; it does not receive simultaneous `v8Data` and `istanbulData` properties. See [Custom Reporter](README.md#available-reports) for examples.

- `mcr test` is a new **optional** command; you do not have to replace your existing test runner.
- `outputFilter` is a new **optional** filter, disabled by default. You do not have to replace `entryFilter` / `sourceFilter` with it.

## Migration checklist

- [ ] Upgrade Node.js in local, CI, container and relevant child-process environments.
- [ ] Update CommonJS/TypeScript imports and any synchronous wrappers.
- [ ] Check imports from `/util` and `/converter`.
- [ ] Check config module formats and explicit config paths.
- [ ] Update local reporter paths to use `./` or `../` and explicit file extensions, or use absolute paths / `file:` URLs.
- [ ] Fix config loading errors and await `loadConfig()` where used.
- [ ] Replace whole-command CLI strings and review shell-dependent commands.
- [ ] Verify test/report failures produce the expected CI exit status.
- [ ] Check timeout settings for slow remote sourcemaps and CDP operations.
- [ ] Regenerate representative reports and compare file lists, sourcemaps, summaries, merged results and coverage thresholds.

See the [README](README.md) for API usage and the [changelog](CHANGELOG.md) for the full list of changes.

