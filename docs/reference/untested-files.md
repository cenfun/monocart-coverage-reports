# Untested files {#untested-files}

## Include untested files {#include-untested-files}

Untested files are excluded by default. Use `all` to include them with 0% coverage, even when no coverage data was collected. For the same original source, real V8 coverage takes precedence over empty entries.
```js
const coverageOptions = {
    all: './src'

    // or multiple dirs
    // all: ['./src', './lib']
};
```

## Filter files {#filter-files}

The untested files will apply to the `sourceFilter`. And it also supports additional `filter` (return the file type for js or css coverage):
```js
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: {
            // exclude files
            '**/ignored-*.js': false,
            '**/*.html': false,
            // empty css coverage
            '**/*.scss': 'css',
            '**/*': true
        }
    }
};
```

## Native TypeScript {#native-typescript}

When retained coverage includes Node-native TS captured by MCR on recent Node.js, `all` analyzes erasable `.ts`, `.mts` and `.cts` files without a transformer or extra TS parser. Type-only declarations do not add executable statements or lines. Other contexts (including an `all`-only report) retain their existing behavior by default. Set `typescript: true` or use a file callback to enable original erasable TS analysis there; `typescript: false` disables it even in a native collection. Explicit transformers take precedence. Non-erasable syntax needs a transformer with a sourcemap for AST metrics; otherwise automatic mode retains the existing uncovered-file fallback, while explicit force-on decisions reject unsupported syntax. See [TypeScript support](/reference/typescript#typescript-support).

## Transform source code {#transform-source-code}

Untested files can be transformed into JavaScript for AST analysis. This example handles **TypeScript without JSX** and assumes `@swc/core` is installed. Use an appropriate compiler/parser for JSX/TSX or Vue; this is not a universal transformer. Preserve the full filename to keep same-basename files in different directories distinct, and parse SWC's JSON map before assigning it.
```js
import { fileURLToPath } from 'node:url';
import { transform } from '@swc/core';
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: '**/*.ts',
        transformer: async (entry) => {
            const { code, map } = await transform(entry.source, {
                filename: fileURLToPath(entry.url),
                sourceMaps: true,
                isModule: true,
                jsc: {
                    parser: {
                        syntax: 'typescript'
                    }
                }
            });
            entry.source = code;
            entry.sourceMap = JSON.parse(map);
        }
    }
};
```
