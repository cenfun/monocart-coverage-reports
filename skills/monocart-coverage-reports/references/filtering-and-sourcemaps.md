# Filtering, sourcemaps, and untested files

## Choose a filtering strategy

For V8 input, choose according to the README's **Approach** comparison, rather than always selecting `outputFilter`. The following comparison is self-contained for package-only/offline use. Both approaches decide which files appear in the report; choose one for the intended scope, not both automatically.

| Approach | When and what it filters | Advantages | Trade-offs |
| --- | --- | --- | --- |
| `entryFilter` + `sourceFilter` (or `filter`) | Entry URLs during discovery, then source paths as sourcemaps are unpacked | Early exclusion avoids unnecessary downstream work; prefer when performance matters, especially for large projects/bundles | Requires entry/source knowledge; excluding a bundle also removes desired sources inside it |
| `outputFilter` (3.x only) | Final `sourcePath` after conversion, merging, and adding untested files (`all`) | One filter against the final file list; simpler configuration | Unwanted inputs are still processed first, increasing generation time and memory usage |

Use input filtering when performance matters. Choose output filtering when simpler final-file selection is more important and the earlier processing cost is acceptable. If switching strategies, remove old input filters for the same scope: output filtering cannot restore previously excluded inputs.

| Option | Receives / matches | Stage |
| --- | --- | --- |
| `entryFilter` | Entry object function (`entry.url`), or URL patterns | Before converting bundles |
| `sourceFilter` | Source path string, or path patterns | Sources unpacked from sourcemaps; also untested files |
| `filter` | Entry object or source path string | Shorthand for both input filters; not `outputFilter` |
| `outputFilter` | Final file object function (`entry.sourcePath`), or final path patterns | After sourcemap conversion, merging, and `all` |

Example input filtering for **directly executed source modules**, including entries without sourcemaps:

```js
// input-filter.config.mjs
export default {
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

For a **bundled build**, allow the actual application bundle URLs instead (adapt `dist/` and vendor rules to the tested build):

```js
// bundle-filter.config.mjs
export default {
    entryFilter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/dist/**': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    }
};
```

`sourceFilter` does not filter already collected entries without sourcemaps. For directly executed sources, restrict their URLs with `entryFilter`, or use 3.x `outputFilter` to limit the final file list. A permissive `entryFilter` plus `sourceFilter: '**/src/**'` can still include unmapped test/helper scripts.

An entry may be `dist/main.js` but contain the desired `src/*` sources. Filtering entries to `**/src/**` would discard that bundle before its sources can be recovered.

Alternative final-file selection:

```js
// output-filter.config.mjs
export default {
    outputFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    }
};
// Or: outputFilter: (entry) => entry.sourcePath.startsWith('src/')
```

- Ordered pattern objects use **first match wins**; unmatched files are excluded. Put exclusions before a broad inclusion. Quote CLI patterns to avoid shell expansion.
- Glob wildcards do not necessarily include dot-prefixed path segments (for example `.temp` or framework build directories). Inspect actual URLs/paths and use an explicit pattern for the hidden segment or a function filter when necessary; do not assume `**/*` includes every generated entry.
- `sourceFilter` functions receive a string; `outputFilter` functions receive an object. Do not interchange signatures.
- `outputFilter` matches paths **after `sourcePath` rewriting**, cannot recover entries removed by earlier filters, and does not avoid earlier conversion cost.
- `outputFilter` affects V8 reports and Istanbul reports converted from V8, but not raw exports or Istanbul input maps.
- When migrating a scope to `outputFilter`, remove old input filters for that same scope unless their intersection is intentional.

## Build the tested code with usable maps

Generate sourcemaps for the exact build that tests execute, preferably with original source content available. Common coverage-build settings:

| Build tool | Settings |
| --- | --- |
| Vite | `build: { sourcemap: true, minify: false }` |
| webpack | `devtool: 'source-map'`, `mode: 'development'` |
| Rollup | `output.sourcemap: true`, `treeshake: false` |
| esbuild | `sourcemap: true`, `treeShaking: false`, `minify: false` |

Change only the intended test/coverage build, not production settings without approval. Minification/transformation can make branch mapping approximate; MCR cannot promise perfect mapping of arbitrary transformed code. Ensure external maps are reachable or attach matching `entry.sourceMap` data; do not substitute maps from a different build.

## Normalize paths for merging

Use a shared `baseDir` when collection/generation working directories differ. Use `sourcePath` to remove known build-specific virtual prefixes, preserving unique business paths:

```js
const options = {
    sourcePath: (filePath) => {
        const prefixes = ['unit-dist/', 'e2e-dist/'];
        const prefix = prefixes.find((value) => filePath.startsWith(value));
        return prefix ? filePath.slice(prefix.length) : filePath;
    }
};
```

Only rewrite prefixes actually observed in reports. Do not collapse everything to basename: unrelated `index.ts` files would collide. Normalize the same logical source consistently across server/client/shards, and verify that supposedly identical paths refer to the same source version.

## Include untested files

By default, files never loaded are absent, not automatically 0%. Choose the real application directories:

```js
const options = {
    all: {
        dir: ['./src'],
        filter: {
            '**/*.test.js': false,
            '**/*.spec.js': false,
            '**/*.js': true,
            '**/*.css': 'css'
        }
    },
    sourceFilter: '**/src/**'
};
```

`all.filter` runs before `sourceFilter`. With 3.x final filtering, `outputFilter` also applies after untested files are added. Current checkout behavior can generate an all-untested V8 report with no collected entries; treat this separately from unexpected missing collection data.

For TS/JSX/Vue sources that the JS AST parser cannot directly parse, use an appropriate transformer already present in the host. Example for **TypeScript without JSX**, if `@swc/core` is installed:

```js
// untested-typescript.config.mjs
import { fileURLToPath } from 'node:url';
import { transform } from '@swc/core';

export default {
    all: {
        dir: './src',
        filter: '**/*.ts',
        transformer: async (entry) => {
            const { code, map } = await transform(entry.source, {
                filename: fileURLToPath(entry.url),
                sourceMaps: true,
                isModule: true,
                jsc: { parser: { syntax: 'typescript' } }
            });
            entry.source = code;
            entry.sourceMap = JSON.parse(map);
        }
    }
};
```

SWC returns its map as a JSON string; parse it before assigning `entry.sourceMap`. Preserve the full filename so different directories' `index.ts` files retain distinct source paths. Use a consistent `baseDir` when generating or merging.

Use the matching JSX/TSX or Vue compiler for those languages; this is not a universal `.vue` transformer. `all.transformer` handles untested sources; `onEntry` is the separate per-collected-V8-entry hook. Preserve sources/maps/offsets consistently when transforming collected data.

## Intentional ignores

MCR supports `/* v8 ignore next */`, `/* v8 ignore next 3 */`, and `/* v8 ignore start */` / `/* v8 ignore stop */`. `v8Ignore` defaults to true. Verify that the comments survive the tested build. Do not add ignore comments or exclude difficult files merely to raise coverage; explain and agree on legitimate exceptions.

## Debugging checklist

1. Verify collection started before module import/navigation, and that entries include expected URLs and real source text.
2. Temporarily inspect entry URLs and mapped source paths before tightening filters. A wrong stage/pattern is a common cause of empty reports.
3. Rebuild without minification; verify maps and source content match the executing bundle.
4. Use `{ logging: 'debug', sourceMap: true }` to retain cache/source/map files for investigation. Debug mode also retains generated dist entries in V8 results, so its file list can differ from normal mode.
5. Compare generated versus original ranges and inspect a representative covered/uncovered branch. Never fix results by editing coverage counts.
6. For large inputs, filter early and reduce unnecessary maps/entries before raising memory limits. The `gc` option is a heap threshold in MB; `NODE_OPTIONS=--max-old-space-size=8192` is a separate Node heap setting. Measure rather than promising either will solve OOM.

Debug/raw artifacts and inline HTML can contain source code, URLs, and internal paths. Apply the host's artifact-retention and publication rules; do not upload private sources to public services without permission.
