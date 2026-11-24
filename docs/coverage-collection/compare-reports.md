# V8 vs Istanbul {#v8-vs-istanbul}
For Node.js or Chromium, prefer [V8 collection](/coverage-collection/v8): it does not modify the code under test. To collect JavaScript coverage in Firefox or WebKit, use [Istanbul instrumentation](/coverage-collection/istanbul).

**Collection and reporting are separate choices.** If your tooling requires an Istanbul report, MCR can convert V8 input without instrumenting the code again. See [both report formats generated from the same data](/getting-started/examples#v8-and-istanbul).

| Feature | Istanbul → Istanbul report | V8 → V8 report | V8 → Istanbul report |
| :--------------| :------ | :------ | :----------------------  |
| Coverage data | [Istanbul](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md) (Object) | [V8](/reference/coverage-data#v8-coverage-data) (Array) | [V8](/reference/coverage-data#v8-coverage-data) (Array) |
| Output | [Istanbul reports](/reference/reports#istanbul-reports) | [V8 reports](/reference/reports#v8-reports) | [Istanbul reports](/reference/reports#istanbul-reports) |
| - Bytes | ❌ | ✅ | ❌ |
| - Statements | ✅ | ✅ | ✅ |
| - Branches | ✅ | ✅ | ✅ |
| - Functions | ✅ | ✅ | ✅ |
| - Lines | ✅ | ✅ | ✅ |
| - Execution counts | ✅ | ✅ | ✅ |
| CSS coverage | ❌ | ✅ | ✅ |

For minified output, prefer V8's native coverage ranges. Mapping back to original sources still requires a matching, sufficiently precise sourcemap. If results look wrong, [compare against an unminified build](/troubleshooting/common-issues#unexpected-coverage).

## Choosing a collection method {#choosing-a-collection-method}

### V8: No instrumentation {#v8-tradeoffs}

- **Strengths:** Collect coverage directly from the runtime without modifying the tested code.
- **Tradeoffs:** Requires a V8 runtime with a coverage interface, such as Node.js or Chromium. Compiled or bundled code needs matching sourcemaps to map coverage back to original sources.

See [V8 collection](/coverage-collection/v8), [Sourcemaps and debugging](/troubleshooting/sourcemaps) and [V8 coverage data](/reference/coverage-data#v8-coverage-data).

### Istanbul: Cross-engine collection {#istanbul-tradeoffs}

- **Strengths:** Does not depend on browser-specific native coverage APIs, making it suitable for cross-engine JavaScript tests.
- **Tradeoffs:** Requires instrumentation during the build or test preparation, and tests must run that instrumented code, adding configuration and execution overhead.

::: warning Instrumentation Issues
Instrumentation typically relies on plugins or transformation steps compatible with your build tool. Established setups such as Webpack + Babel have mature integrations, but support varies across build tools; newer tools may not have a ready-to-use instrumentation plugin.

Working with plain JavaScript does not guarantee the same setup works with TypeScript, Vue single-file components or React JSX/TSX. Check compatibility with syntax transforms, plugin order and the sourcemap chain; additional configuration or custom transformations may be needed.

Instrumentation adds counters and helper code for statements, branches and functions, then updates those counters at runtime. Large numbers of instrumentation points can substantially increase code size and may affect loading and execution performance, especially on frequently executed paths. The overhead depends on the instrumentation scope and workload.
:::

See [Istanbul collection](/coverage-collection/istanbul#build) for build integrations.

### Use MCR native reports {#native-v8-reports}

Where supported, **MCR recommends native V8 coverage data** with its [native `v8` report](/reference/reports#v8-reports), without instrumentation or conversion to Istanbul. It preserves the **Bytes metric** and can display **CSS coverage** collected through Chromium browser / CDP APIs.

V8 has supported native JavaScript coverage since [2017](https://v8.dev/blog/javascript-code-coverage). See [this article](https://gist.github.com/cenfun/0754c23f03d1aa541b4467920ab4d09f) for background.

For Node.js tests, see [`mcr test`](/getting-started/node-test-runner#quick-start); for browsers, see [Playwright collection](/coverage-collection/v8#playwright).
