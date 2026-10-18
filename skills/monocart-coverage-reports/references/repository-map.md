# Repository navigation and maintenance

This is a map of project source files, **not** a JavaScript sourcemap specification. For coverage sourcemaps read [filtering-and-sourcemaps.md](filtering-and-sourcemaps.md).

## Installed-package authority

From the host application's root:

```sh
node -p "require.resolve('monocart-coverage-reports/package.json')"
node -p "require.resolve('monocart-coverage-reports')"
```

Resolve the manifest's `types` relative to its package directory (current path: `lib/index.d.ts`). Read the installed declarations and `lib/default/options.js` before inventing an API. `README.md`, `README.zh-Hans.md`, and `migrate-to-3.md` describe integration/version behavior. File inspection inside `lib/` does not make those files public package exports. Do not import arbitrary internals into a host application.

Current exports: main API, `/register` source-capture preload, `/converter` and `/util` named exports, `/package.json`, and `/skills/*` file resolution. Use the high-level API unless a task explicitly requires lower-level conversion.

## Checkout navigation

Paths below are relative to the repository root and are generally **not shipped in npm** except `lib/`.

| Task | Read first | Related validation / examples |
| --- | --- | --- |
| Public factory, config, cache lifecycle | `lib/index.js`, `lib/index.d.ts`, `lib/default/options.js` | `test/unit/config.test.js`, `test/unit/esm.test.js` |
| CLI execution, test targets, signals | `lib/cli.js` | `test/unit/cli-test.test.js`, `test/unit/cli-signal.test.js`, `test/specs/node.test.js` |
| Input reading/merge/report dispatch | `lib/generate.js` | `test/test-merge.js`, `test/test-merge-v8.js`, `test/test-merge-istanbul.js` |
| Source capture/import hooks | `lib/register/register.js`, `lib/register/hooks.js` | `test/unit/register.test.js`, `test/unit/source-map-comments.test.js` |
| CDP/WebSocket collection | `lib/client/cdp-client.js`, `lib/client/coverage-client.js`, `lib/client/ws-session.js` | `test/test-client.js`, `test/unit/ws-session.test.js` |
| Node capture workflows | `test/test-node-env.js`, `test/test-node-api.js`, `test/test-node-ins.js` | `test/test-node-cdp.js`, `test/test-node-vm.js` |
| Browser data shapes | `test/test-v8.js`, `test/test-puppeteer.js`, `test/test-css.js` | `test/test-istanbul.js` |
| Conversion and sourcemaps | `lib/converter/converter.js`, `lib/converter/collect-source-maps.js`, `lib/converter/find-original-range.js` | `test/test-esbuild.js`, `test/test-rollup.js`, `test/test-swc.js` |
| AST metrics/ignore/untested sources | `lib/converter/ast.js`, `lib/converter/ast-visitor.js`, `lib/converter/ignore.js`, `lib/converter/untested.js` | `test/test-v8.js`, `test/test-sections.js` |
| Filters and normalized paths | `lib/utils/util.js`, `lib/utils/source-path.js`, `lib/generate.js` | `test/unit/output-filter.test.js`, `test/unit/source-path.test.js` |
| Native V8/Istanbul generation | `lib/v8/v8.js`, `lib/istanbul/istanbul.js`, `lib/reports/` | `test/test-v8-and-istanbul.js`, custom reporter examples under `test/` |
| Snapshots | `lib/utils/snapshot.js` | `test/check-snapshot.js`, `test/snapshot/` |
| Report UI | `src/app/`, `src/vendor/`, `vite.config.mjs` | `npm run dev`, `npm run build` |
| Runtime compatibility / upgrade | `migrate-to-3.md`, `scripts/test-runtime.js` | `test/unit/node-version.test.js` |

## Development validation

Read current `package.json` scripts before running them. Typical commands from a checkout with dependencies installed:

```sh
npm run test-unit
npm run test-types
npm run test-runtime
```

Unit tests run directly with `node:test`, independently of the MCR CLI and coverage pipeline. For a focused test: `node --test test/unit/config.test.js`. Run `npm run test-unit-coverage` separately to collect coverage through `mcr test`; reports are written to `.temp/coverage-unit/`. For focused coverage: `node ./lib/cli.js test -c test/mcr.config.unit.js test/unit/config.test.js`. Browser/integration scripts may require downloaded browsers, built fixtures, local servers, and more time; inspect the relevant script before running it. `npm run build` invokes `postbuild` and builds test fixtures. `npm test` also runs integration/report generation and documentation generation; it is not a lightweight unit-only check.

Avoid unrelated generated changes. `npm run lint` currently includes `--fix`; inspect its scope before invoking it. Do not edit generated `lib/packages/*`, `lib/assets.js`, `dist/`, `docs/`, or snapshots just to hide a source defect; use the project's build/generation workflow when those artifacts genuinely need updating.

When changing public behavior, align implementation, `lib/index.d.ts`, default options, English/Chinese docs, migration notes where applicable, and focused tests. This skill supports MCR 3.x only. Validate the installed package separately when release compatibility matters; do not infer support for other major versions from these recipes.

For changes to this skill, verify relative Markdown links, public resolution of `SKILL.md`, npm pack inclusion of **all** references, and any executable examples affected by the API change.
