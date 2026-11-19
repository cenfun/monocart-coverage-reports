# TypeScript support {#typescript-support}

::: warning Node.js only
The direct TypeScript execution and coverage support described on this page applies **only to Node.js**, not browsers. For browser applications, continue to build TypeScript into JavaScript, collect coverage from the executed JavaScript, and use sourcemaps to map coverage back to the original TS. The `typescript` option does not enable browsers to execute TS directly or replace that build/sourcemap workflow.
:::

MCR can generate native V8 coverage reports for TypeScript executed directly by Node.js. For Node's **erasable TypeScript syntax**, no build step, `tsx`, `ts-node`, or separately installed TypeScript parser is required:

```sh
npx mcr node ./src/example.ts
npx mcr test "./test/*.test.ts"
```

This is native Node.js execution, not a TypeScript compiler bundled into MCR. Existing loader and build/sourcemap workflows remain supported for projects that need them.

## Node.js requirements {#nodejs-requirements}

MCR requires **Node.js >= 22.18.0**. Native type stripping is enabled by default on the supported LTS lines, so the commands on this page need no additional execution flags. Node.js 24.12+ or Node.js 26 is recommended. Check the version used to launch MCR with `node --version`.

| Node.js LTS line | Native TS execution |
| --- | --- |
| 22.x (22.18+) | Enabled by default, without the execution feature's experimental warning. |
| 24.x | Enabled by default; type stripping is marked stable starting with 24.12. |
| 26.x | Enabled by default. |

Earlier Node.js 22 releases are not supported. Test discovery and available JavaScript/TypeScript syntax still follow the installed Node.js version.

MCR uses Node's built-in `module.stripTypeScriptTypes()` for analysis. This API has its own stability status: some Node.js versions, including Node 24, may still emit an experimental warning when generating a report, even though direct TS execution is stable. MCR does not suppress Node's warnings globally.

See the [Node.js TypeScript documentation](https://nodejs.org/api/typescript.html) for runtime support and syntax restrictions.

## Run a TS program {#run-a-ts-program}

For ESM `.ts` files, use `"type": "module"` in your project's `package.json`. Save the following as `src/math.ts`:

```ts
export interface Input {
    value: number;
}

export function magnitude(input: Input): number {
    if (input.value < 0) {
        return -input.value;
    } else {
        return input.value;
    }
}
```

Create `src/example.ts`:

```ts
import { magnitude } from './math.ts';

console.log(magnitude({ value: -2 }));
```

Install MCR and run the program:

```sh
npm i -D monocart-coverage-reports
npx mcr node ./src/example.ts -r v8,console-summary -o ./coverage-reports
```

Open `coverage-reports/index.html`. The report displays the original TS, including types, while executable statements, functions, branches and lines are analyzed using Node's type-stripped JavaScript. Only the negative branch runs in this example.

## Run TS tests {#run-ts-tests}

Create `test/math.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magnitude } from '../src/math.ts';

test('negative input', (): void => {
    assert.equal(magnitude({ value: -2 }), 2);
});
```

Run Node's built-in test runner and generate coverage in one command:

```sh
npx mcr test "./test/*.test.ts" -r v8,console-summary -o ./coverage-reports
```

- Quote glob patterns so Node, rather than the shell, handles matching. For nested tests, use a pattern such as `"./test/**/*.test.ts"`.
- MCR forwards targets to `node --test`. Test discovery and glob support depend on the installed Node.js version; MCR does not implement a separate TS test discovery mechanism.
- Tests can use `node:test` and `node:assert/strict`; no additional test runner is required.
- Test failures retain a nonzero exit status while still generating available coverage. Report-generation failures are also nonzero.

See [Run tests with mcr test](/getting-started/node-test-runner#run-tests-with-mcr-test) for runner arguments and test-result hooks.

## Configure coverage {#configure-coverage}

A native `mcr.config.ts` can use type imports and `satisfies` without preloading a loader:

```ts
import type { McrCliOptions } from 'monocart-coverage-reports';

export default {
    test: './test/**/*.test.ts',
    reports: ['v8', 'console-summary'],
    outputDir: './coverage-reports',
    entryFilter: '**/src/**',
    all: {
        dir: './src',
        filter: {
            '**/*.d.ts': false,
            '**/*.ts': true,
            '**/*.mts': true,
            '**/*.cts': true
        }
    }
} satisfies McrCliOptions;
```

```sh
npx mcr node ./src/example.ts
# Use the configured test targets
npx mcr test
# Or override them explicitly
npx mcr test "./test/*.test.ts"
```

`entryFilter` keeps application sources rather than test files. When retained coverage includes Node-native TS captured by MCR, `all` also analyzes unexecuted erasable TS without a transformer, with its runtime functions, branches and statements counted as uncovered. For other TS dialects, the existing untested-file fallback is retained: source is reported as uncovered, but runtime functions, branches and statements cannot be inferred. Use an appropriate transformer and sourcemap to obtain those AST metrics. See [Untested files](/reference/untested-files#untested-files).

To avoid changing existing browser/bundler reports, an `all`-only run, a report with all native TS entries filtered out, or a report collected without native runtime identity retains its previous untested-file behavior. Use `typescript: true` to analyze original erasable TS in those workflows. For other syntax, supply `all.transformer` with a sourcemap; existing transformers always take precedence.

MCR discovers `mcr.config.ts` after the other default config filenames; an existing `mcr.config.js` takes precedence. Use `-c ./mcr.config.ts` to select it explicitly. Relative paths use the working directory.

## Analysis policy {#analysis-policy}

The V8-only [`typescript` option](/reference/options#typescript) defaults to `null`:

| Value | Mode |
| --- | --- |
| Omitted, `undefined`, `null`, `{}`, `{ enabled: undefined }` | Conservative automatic detection. |
| `true` or `{ enabled: true }` | Force analysis of eligible original TS, even without loading metadata. |
| `false` or `{ enabled: false }` | Disable MCR's TS analysis, including sources identified as native TS. |
| `(info) => result` | Resolve final settings separately for each eligible file. |
| `{ enabled: (info) => boolean }` | Decide whether to analyze each eligible file. |

Automatic mode uses confirmed Node-native loading, plus untested files associated with that native collection context. It does **not** retry arbitrary TS-looking sources after a JavaScript parse error. This keeps old browser, loader and bundler workflows unchanged.

Force mode only applies to eligible `.ts`, `.mts`, `.cts` sources or sources with confirmed native identity. It does not reinterpret ordinary JS/CSS, fake sources, mapped transformed JS, or explicit `all.transformer` output. It does not add support for non-erasable syntax.

For an `all`-only report or original Node TS coverage collected without MCR's preload:

```js
export default {
    typescript: true,
    all: {
        dir: './src',
        filter: '**/*.ts'
    },
    reports: ['v8']
};
```

CLI boolean overrides are also available:

```sh
npx mcr --typescript node ./src/example.ts
npx mcr --no-typescript node ./src/example.ts
npx mcr --typescript merge --inputDir ./raw
```

Omit both flags to preserve the config value; with no config value the mode is automatic. Objects and callbacks belong in a config file or API options, not CLI flag values.

**Disabling analysis does not disable Node's TS execution.** MCR uses its old JS/fallback path instead, which may not yield accurate AST or line metrics for original TS. For accurate coverage with TS analysis disabled, provide transformed JS and a usable sourcemap.

## File callbacks {#file-callbacks}

The two callback forms are alternatives, not a chain:

```js
export default {
    typescript: (info) => ({
        enabled: info.nativeTypeScript || info.sourcePath.startsWith('src/native/')
    })
};
```

Or:

```js
export default {
    typescript: {
        enabled: (info) => info.nativeTypeScript || info.empty
    }
};
```

Each callback is called **once per eligible runtime URL/path/collection-context combination or selected untested file**, before report aggregation, not once per report and not only for the outermost program entry. Repeated executions of the same file/path with matching loading facts and script coordinate spans are combined first; different runtime URLs retain their own analysis decisions even when their final report paths match. Runtime entry filters and untested-file filters run before their callbacks. Callbacks do not run for ordinary JS/CSS, fake sources, transformed JS with a sourcemap, or explicit `all.transformer` output.

The top-level callback can return a boolean, `null`, `undefined`, or final `{ enabled?: boolean }` options. Missing `enabled` means automatic. An `enabled` callback must return a boolean. Neither form may return a Promise; a top-level callback may not return another callback or an object containing an `enabled` callback. This guarantees a single user callback per file decision.

The readonly [`TypeScriptFileInfo`](/reference/types#typescriptfileinfo) object contains:

| Field | Meaning |
| --- | --- |
| `url` | Original execution URL, or file URL for an untested file. |
| `sourcePath` | Normalized report path, including any `sourcePath` rewrite. |
| `nativeTypeScript` | Confirmed Node-native loading. `false` means unconfirmed, not necessarily non-TS. |
| `empty` | Whether the entry represents untested coverage. |

`nativeTypeScript` comes from Node's `module-typescript` / `commonjs-typescript` load formats, not the extension or the current parsing decision. An untested file always has `nativeTypeScript: false`, even when it is associated with a native TS collection. Enabling analysis does not change this fact.

Native loading facts stay local to each collection context. If another execution of the same original TS has no native identity, enable analysis explicitly for that execution when appropriate; automatic mode does not borrow identity from a native copy. Incompatible analysis sources still reject aggregation.

The description is a frozen copy, not the mutable coverage entry. Callbacks are synchronous and must not mutate it. Thrown errors, invalid return types and unsupported settings such as the misspelling `endabled` fail report generation rather than silently falling back. Only `enabled` is currently supported in the options object; additional settings such as `filter` are reserved for future design, not accepted yet.

Returning `false` changes the analysis branch; it does not exclude the file from the report. Use coverage filters to exclude files.

## Coverage semantics {#coverage-semantics}

- **Original source:** the CLI's source-capture hook preserves native `.ts`, `.mts` and `.cts` source text even without a sourcemap. Do not edit sources between collection and reporting; keep the exact tested source and coverage together, especially when collecting without the MCR preload.
- **AST and lines:** MCR analyzes the position-preserving JavaScript produced by Node's `strip` mode. Type declarations, overload signatures, and type-only imports are not executable statements or executable lines. Erased-only lines are classified as blank for coverage; the visible source still contains the original types.
- **Type-only modules:** have no runtime functions, branches, statements or executable lines. This also applies to `all` entries analyzed in the native TS context described above.
- **Bytes:** retain MCR's source-text-based accounting, including the original source length. Byte coverage is not a measurement of executable TS tokens; type-only files can still contribute to this metric.
- **Raw reports:** retain original source, V8 ranges, native loading facts and untested collection context for later merging. Parsing decisions are not permanently stored: each generation uses its current `typescript` setting, so `false` overrides saved native identity and manually forced unknown data needs force again when merged. Prefer the same Node.js version for collection and regeneration: Node's TS parser can change between versions.
- **Runtime identity:** MCR's preload records when Node actually loaded native TS and preserves that identity through raw reports. In automatic mode other input stays on the existing JS path: a `.ts` execution URL or a JS parse error alone does not enable stripping or BOM adjustment.
- **Sourcemaps:** when transformed runtime code has a usable sourcemap, MCR keeps the existing generated-code-to-original-source path instead of treating mapped original TS as native runtime code.

The default automatic setting is sufficient for ordinary native TS CLI execution.

## Supported syntax {#supported-syntax}

Node's erasable syntax includes type annotations, interfaces, type aliases, type-only imports/exports, generic type parameters, overload signatures, `as`, `satisfies` and non-null assertions. A type-only `namespace` is also supported by current Node.js versions.

Use the appropriate file/module format:

| Extension | Module system |
| --- | --- |
| `.ts` | Determined like `.js`; use `"type": "module"` for ESM. |
| `.mts` | Always ESM. |
| `.cts` | Always CommonJS; use CommonJS runtime exports. |

Write relative imports with their actual extension, for example `import './math.ts'`. Use `import type` for imports that exist only at the type level. Type annotations in `.js` files are not enabled by this feature.

## Limitations {#limitations}

- **No type checking.** Run `tsc --noEmit` separately if needed. TypeScript itself is optional for execution and coverage.
- **No `tsconfig.json` execution settings.** Node does not apply `paths`, convert module systems, or downlevel JavaScript according to `target`.
- **No TSX/JSX.** Use a suitable loader or build tool for React/JSX sources.
- **No transformation of non-erasable TS.** Examples include `enum`, constructor parameter properties, runtime `namespace` declarations and TypeScript import aliases. MCR does not enable `--experimental-transform-types` or silently fall back to another compiler. In automatic mode unsupported untested TS retains the existing fallback with no AST metrics. An explicit force-on decision instead fails analysis for unsupported syntax. Use `all.transformer` with a sourcemap for accurate function, branch and statement counts outside erasable syntax.
- **No decorator transformation.** Use a toolchain that supports the decorators used by your project.
- **No native TS distribution shortcut.** Node normally refuses to strip TS under `node_modules`; publish compiled JS for libraries unless using another supported distribution strategy.
- **Not browser TS execution.** Browsers and bundlers still need their existing compilation/sourcemap workflows.

For a project outside these restrictions, install a suitable runtime yourself, for example `tsx`, and retain that workflow:

```sh
npm i -D tsx
npx mcr --import tsx node ./src/example.ts
npx mcr --import tsx test "./test/*.test.ts"
```

For transformed untested files, also configure an appropriate `all.transformer`. See [Frameworks and tools](/integrations/frameworks-and-tools#typescript) and [Untested files](/reference/untested-files#transform-source-code).

## Repository examples {#repository-examples}

In an MCR source checkout with dependencies installed and runtime bundles built:

```sh
npm run test-node-ts
npm run test-mcr-test-ts
```

These execute the dedicated `test/node-ts/` fixtures directly, without building them or loading `tsx`. The first uses `mcr node`; the second uses `mcr test`. Their configs are `test/mcr.config.node-ts.ts` and `test/mcr.config.mcr-test-ts.ts`.

Reports are written to `.temp/site/reports/node-ts/index.html` and `.temp/site/reports/mcr-test-ts/index.html`. The examples cover `.ts`, `.mts`, `.cts`, type-only modules and unexecuted TS. See [Report examples](/getting-started/examples#report-examples) for links.
