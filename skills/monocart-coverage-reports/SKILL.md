---
name: monocart-coverage-reports
description: Collect, generate, merge, and debug JavaScript, TypeScript, and CSS code coverage with monocart-coverage-reports (MCR). Use for writing simple Node.js tests and running mcr test with automatic coverage reports, native V8 or Istanbul coverage, Playwright/Puppeteer Chromium coverage, Node.js coverage, mcr CLI/configuration, sourcemaps, coverage filters, untested files, LCOV/Codecov/Cobertura reports, CI thresholds, and migration from MCR 2.x to 3.x. Also applies to Chinese requests about Monocart、代码覆盖率、覆盖率报告、覆盖率合并、覆盖率过滤和源码映射.
---

# Coverage with Monocart Coverage Reports

## Language, portability, and loading

- Follow the user's language for replies and generated report labels. Equivalent requests in any language activate the same workflow; exact English trigger words are not required.
- Use the host project's existing package manager, test runner, build tools, and module conventions. MCR generates reports from collected data; it does not replace the test framework or instrument Istanbul code automatically.
- Copy/distribute this entire directory, including `references/`. Resolve bundled links relative to this skill, not the working directory. No agent-specific tools are required.
- The npm package includes the skill but does not automatically register it with agents or change agent settings. From the **host project root**, locate it with:

```sh
node -p "require.resolve('monocart-coverage-reports/skills/monocart-coverage-reports/SKILL.md')"
node -p "require.resolve('monocart-coverage-reports/package.json')"
```

Read the first file, then its relative references. Read the resolved manifest for installed version, engines, exports, and types. These commands resolve files; do not import Markdown as JavaScript. Older packages may not contain/export the skill; use a complete copied skill directory instead.

**Package-only/offline mode:** the bundled references contain standalone integration examples. The package includes `lib/`, README files, and the migration guide, but not repository `src/`, `test/`, or `scripts/`. Repository paths in [source-map.md](references/source-map.md) are optional navigation for a checkout, not prerequisites or public exports. Do not run repository development commands inside an installed dependency.

## Version gate — do this first

This skill follows the current checkout's **3.x API/runtime behavior**. At authoring time its manifest still says `2.13.2`, while its implementation and migration guide already contain 3.x changes. A version string alone does not identify this transitional checkout. For released dependencies, use the installed release's documentation, declarations, and exports as authority.

- Current checkout / MCR 3.x: **Node.js >= 22.15.0**, native ESM API. Both default and named `MCR` are factories; `CoverageReport` is a class.
- `mcr test` and `outputFilter` are **3.x additions**, not capabilities of published 2.13.x releases.
- Do not copy old callable `require('monocart-coverage-reports')` examples into a 3.x integration. In CommonJS, use async `import()` without converting the entire application to ESM.
- For upgrade work, read [CLI and migration](references/cli.md), plus the installed `migrate-to-3.md` if available. Do not upgrade the host runtime or dependency silently.

## Workflow and reference routing

1. Inspect host `package.json`, lockfile, runtime, MCR version/module format, existing coverage scripts, and CI. Identify the runtime under test (Node, Chromium, or already instrumented Istanbul), desired source scope, output formats, and whether runs are parallel/sharded.
2. Choose one collection path. For a small Node task without an existing test setup, write a built-in Node test and use the quick start below; otherwise reuse the existing runner and minimal CLI integration. For other runtimes, read [collection.md](references/collection.md) for Playwright, Puppeteer, CDP, Node environment capture, or Istanbul.
3. Confirm sources/sourcemaps match the **exact tested build**. Choose input versus output filtering according to the README's Approach trade-offs, not a fixed preference for `outputFilter`. Read [filtering-and-sourcemaps.md](references/filtering-and-sourcemaps.md) for filters, path normalization, untested files, ignores, and conversion debugging.
4. Read [cli.md](references/cli.md) for argument boundaries, config loading, Node test runner, hooks, and migration.
5. Read [reports-and-ci.md](references/reports-and-ci.md) for report formats, thresholds, multi-process collection, raw exports, shard merging, and snapshots.
6. For library maintenance or uncertain behavior, consult [source-map.md](references/source-map.md), then inspect only relevant source/tests. Do not load every reference by default.
7. Run representative tests/report generation; inspect file lists, source mapping, summaries, output artifacts, and failure exit codes. Report actual checks and limitations.

## Quick start: test your code and get coverage (3.x)

For a small Node.js task, you can write a simple test with built-in `node:test` and `node:assert/strict`, install MCR, and run `mcr test <test-file>` to test the code and automatically generate coverage. No separate test framework or manual coverage collector is required. Reuse an existing test setup when one is already present.

For example, create a module (or use the real code you need to test):

```js
// src/add.mjs
export function add(a, b) {
    return a + b;
}
```

Write a test that imports and exercises that module:

```js
// test/add.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../src/add.mjs';

test('adds positive and negative numbers', () => {
    assert.equal(add(2, 3), 5);
    assert.equal(add(-2, 3), 1);
});
```

Install a compatible MCR version with the host package manager, then run:

```sh
npm install --save-dev monocart-coverage-reports
npx mcr test ./test/add.test.mjs -r v8,console-summary
```

Use `v8` and `console-summary` as the recommended starting report pair: inspect the interactive report at `./coverage-reports/index.html` and the summary in the terminal. They are explicitly selected by `-r`; MCR's built-in V8 default is only `v8`, not both reports. This quick start needs no config; if the host already has an MCR config, its other options still apply. Add meaningful assertions for the actual task, then inspect uncovered code to decide which cases to test next. Failed tests still attempt report generation and return a nonzero status. See [CLI details](references/cli.md) for globs, config, and Node runner options.

## Choose a filtering approach

Follow the README's Approach comparison and choose **one strategy for the intended scope**:

| Approach | Choose when | Trade-off |
| --- | --- | --- |
| `entryFilter` + `sourceFilter` (or combined `filter`) | Performance matters, particularly for large projects/bundles | Excludes inputs early, but requires understanding entry URLs versus sourcemap source paths; rejecting a bundle also rejects its sources |
| `outputFilter` (3.x) | Simpler configuration against final `sourcePath` matters more | Runs after conversion, merging, and `all`; unwanted files still incur earlier processing time and memory costs |

Do not add both strategies automatically. `filter` is shorthand for the input strategy, not `outputFilter`. Final filtering cannot restore an input excluded earlier. Read [filtering-and-sourcemaps.md](references/filtering-and-sourcemaps.md) for examples of both strategies, including bundle-specific entry rules.

## Minimal Node integration (3.x)

Install as a development dependency if missing, using the host package manager:

```sh
npm install --save-dev monocart-coverage-reports
npx mcr -c mcr.config.mjs -- node ./app.js
```

Create `mcr.config.mjs` in the host root (change the scope to real application paths):

```js
// mcr.config.mjs
export default {
    name: 'Application Coverage',
    outputDir: './coverage-reports',
    reports: ['v8', 'console-summary', 'lcovonly'],
    entryFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    }
};
```

This example chooses early input filtering for **directly executed `src/` modules**. `entryFilter` restricts collected URLs, including unmapped entries; `sourceFilter` restricts unpacked sourcemap sources and untested files. For a bundle such as `dist/main.js`, allow its actual entry URL instead of requiring `src/` in that URL, then filter the unpacked sources. If simpler final-path selection is preferable, replace these input filters with the `outputFilter` alternative in [filtering-and-sourcemaps.md](references/filtering-and-sourcemaps.md).

The CLI starts the child with source capture and `NODE_V8_COVERAGE`, then generates reports after it exits. If the host already has a test script, use `npx mcr -c mcr.config.mjs -- npm run test:unit` rather than changing test frameworks. For built-in Node tests use `npx mcr test "./test/**/*.test.js" -c mcr.config.mjs` on 3.x.

## Essential API contracts

```js
import { MCR, CoverageReport } from 'monocart-coverage-reports';

// Equivalent construction styles; pick one.
const report = MCR({ outputDir: './coverage-reports', cleanCache: true });
// const report = new CoverageReport({ outputDir: './coverage-reports' });

// coverageData must already have been collected; see collection.md.
// await report.add(coverageData);
// await report.addFromDir('./node-v8-data');
// const results = await report.generate();
```

- `add(v8Entries)` takes an **array** with V8 JS function ranges and source, or CSS ranges and text. `add(istanbulMap)` takes an Istanbul coverage **object**. These are not interchangeable, and a Node JSON envelope `{ result: [...] }` is not an Istanbul map.
- `addFromDir(dir)` reads Node V8 coverage directories. `dataDir` loads such a directory during `generate()`. MCR `raw` exports are merged via **`inputDir`**, not `addFromDir()`.
- Await `add()`, `addFromDir()`, `loadConfig()`, and `generate()`. Handle `generate()` returning `undefined` when there is no usable data; do not report success just because no exception was thrown.
- `MCR(options)` does **not** automatically load `mcr.config.*`; API callers use `await report.loadConfig(path)` if wanted. CLI commands load config. Explicit constructor/CLI options override config values.
- Default output is `./coverage-reports`; default report is `v8` for V8 input and `html` for Istanbul input. `v8` and `v8-json` require V8 input; Istanbul reporters can consume converted V8 input.
- `clean: true` cleans old report artifacts at generation; `cleanCache` separately controls cached input on initialization. Use a dedicated output directory, never a source/application directory. Do not let workers clean one another's cache.
- `watermarks` color reports; they do **not** enforce CI thresholds. Use an explicit `onEnd` check or check the returned summary.
- Keep original coverage/build artifacts until merging and validation finish. Never try to merge HTML reports, percentages, or `json-summary` files as raw coverage.
- Do not invent c8/nyc/Jest options as MCR options (`include`, `exclude`, `checkCoverage`, etc.). Check MCR's `CoverageReportOptions` and the host runner's integration separately.

## Delivery checklist

- [ ] Installed version, Node runtime, module format, and config file extension agree.
- [ ] Collection starts before executing/navigating to the code; collection stops before closing the page/client.
- [ ] Intended source files appear; dependency/test/generated files are excluded intentionally.
- [ ] Sourcemaps refer to the tested build; report paths and mapped original code are inspected.
- [ ] Untested files are included if required; zero/empty data cannot silently pass a threshold.
- [ ] Fresh runs do not reuse stale inputs; parallel/sharded runs do not delete each other's data.
- [ ] Required artifacts exist (HTML plus assets unless inline, LCOV/JSON/raw as requested).
- [ ] Test failures and threshold failures return nonzero status; CI uploads artifacts even on failure where appropriate.

Deliver changed paths, commands, output locations, assumptions about source scope, and actual validation results in the user's language.
