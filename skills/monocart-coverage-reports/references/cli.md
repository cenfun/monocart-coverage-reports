# CLI and configuration

These recipes support MCR 3.x only (Node.js >= 22.15.0). Verify the installed major version and runtime before using them.

## Executable and argument boundaries

```sh
npx mcr node ./app.js -r v8,console-summary
npx mcr -c mcr.config.mjs -- npm run test:unit
npx mcr -c mcr.config.mjs -- node "./path with spaces/app.js"
```

The separator keeps child flags distinct from MCR flags. In 3.x the child executes through Execa without explicitly enabling shell mode. Do **not** pass a whole command as one string (`mcr "node app.js"`), expect MCR to expand environment variables/globs, or embed `&&`, pipes, and redirections inside a child command string. Move composite steps into an existing npm script or a dedicated script. The outer terminal shell still has its own expansion/redirection rules.

Useful MCR options include `-c/--config`, `-r/--reports`, `-o/--outputDir`, `-i/--inputDir`, `-b/--baseDir`, `-a/--all`, `--entryFilter`, `--sourceFilter`, `--outputFilter` (3.x), `--filter`, `--inline`, `--lcov`, `--import`, `--require`, and `--env [path]`. Use a JS config for functions/complex options rather than inventing flags. `--env` without a path loads `.env` on the current runtime; avoid logging secrets.

## Configuration

```js
// mcr.config.mjs
export default {
    name: 'Application Coverage',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-summary', 'lcovonly'],
    entryFilter: { '**/node_modules/**': false, '**/src/**': true },
    sourceFilter: { '**/node_modules/**': false, '**/src/**': true }
};
```

Choose the filtering approach using the README's Approach trade-offs: input filtering for early exclusion and better performance, or 3.x `outputFilter` for simpler final-path selection at the cost of processing unwanted inputs first. This config chooses input filtering for directly executed `src/` modules. For bundles, change `entryFilter` to allow the actual bundle URLs, then use `sourceFilter` for their unpacked sources. `sourceFilter` alone does not exclude unmapped collected entries. Do not stack both strategies by default; see [filtering-and-sourcemaps.md](filtering-and-sourcemaps.md) for both alternatives.

A CommonJS config can remain `mcr.config.cjs` with `module.exports = { ... }`, even though MCR's own API is ESM. `.js` follows the host's `package.json` module type. Do not add `"type": "module"` to an entire host project merely for one config file.

Default discovery walks upward from cwd and checks `mcr.config.js`, `.cjs`, `.mjs`, `.json`, then `.ts`. Prefer explicit `-c` when a monorepo could find an unintended parent config. TypeScript configs need an appropriate loader, for example when the host already has `tsx`:

```sh
npx mcr --import tsx -c mcr.config.ts -- node ./app.js
```

API loading is explicit:

```js
import { CoverageReport } from 'monocart-coverage-reports';
const report = new CoverageReport();
await report.loadConfig('./mcr.config.mjs');
await report.addFromDir('./coverage-data');
const results = await report.generate();
if (!results) throw new Error('No coverage generated');
```

Constructor/CLI options override config. In 3.x, an explicit missing config or a discovered but broken config throws/exits nonzero; no `strict` switch is needed. No default config found is allowed. Await and propagate errors rather than generating a misleading default report.

## Built-in Node test runner (3.x)

For simple code-validation tasks, write a test with `node:test` and `node:assert/strict`, install `monocart-coverage-reports`, then run `npx mcr test <test-file> -r v8,console-summary`. It runs the tests and automatically generates an interactive V8 report plus a terminal summary without requiring another test framework or a custom coverage collector. See the [complete quick start](../SKILL.md#quick-start-test-your-code-and-get-coverage-3x) for a module and its test. The two reports are an explicitly selected recommendation, not MCR's implicit report default.

```sh
npx mcr test "./test/**/*.test.js" -r v8,console-summary
npx mcr test "./test/unit/**/*.test.js" -c mcr.config.mjs -- --test-reporter=spec
```

Or put targets in config:

```js
export default {
    test: ['./test/unit/**/*.test.js', './test/integration/**/*.test.js'],
    reports: ['v8', 'console-summary'],
    outputDir: './coverage-reports'
};
```

- `mcr test` invokes Node's `--test`; it is not a replacement entry for Jest/Mocha/Playwright tests.
- CLI positional targets **replace** config `test`. Arrays supply separate arguments; a string is one target argument, not a shell command.
- Quote globs for Node to interpret; options after `--` are forwarded to the Node test runner.
- With neither CLI targets nor config `test`, it **skips tests and generates no report**. Do not treat such a run as validated coverage.
- `test` is CLI-only and ignored by ordinary commands/API. Existing runners remain supported through `mcr npm run ...`.
- Test failure still attempts report generation and retains a nonzero exit status. A report-generation failure must fail CI too. Validate both paths.

## Hooks and shutdown

| Hook | Scope / timing |
| --- | --- |
| `onStart(report)` | CLI child execution, before spawn |
| `onReady(report, nodeV8CoverageDir, subprocess)` | CLI, after child exits, before reading inputs |
| `onEntry(entry)` | V8 input processing; can mutate entry |
| `onEnd(results)` | After report generation; suitable for thresholds |

Hooks may be async. Use `onReady` for a concrete flush/readiness condition when necessary, not an arbitrary permanent delay. API integrations manage their own process lifecycle; they do not receive CLI-only hooks automatically. Preserve test/child failures even if cleanup or reporting also fails.

## API use in CommonJS hosts

MCR 3.x uses ESM, but a CommonJS host can use dynamic import without converting its entire application:

```js
// coverage.cjs
async function main() {
    const { MCR } = await import('monocart-coverage-reports');
    const report = MCR({ outputDir: './coverage-reports', cleanCache: true });
    await report.addFromDir('./coverage-data');
    if (!await report.generate()) throw new Error('No coverage generated');
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

Use ESM-aware TypeScript module settings and verify emitted JavaScript. Secondary `/util` and `/converter` entries provide **named exports**, not defaults. These recipes do not cover other major versions; approved upgrades should follow the package's `migrate-to-3.md`.
