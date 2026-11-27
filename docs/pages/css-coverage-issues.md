# CSS coverage issues {#css-coverage-issues}

## Quick diagnosis {#quick-diagnosis}

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Generated CSS appears instead of Sass sources when using `@include` | A generated rule may map to non-contiguous source locations. | [Inspect the rule's mapping](./sourcemaps#inspect-sourcemaps). If it cannot be mapped reliably, [read the coverage on the generated bundle](#sass-mixins-and-include) rather than expecting it in the original-source totals. |
| The report falls back to generated CSS after minification | CSS minification can produce imprecise sourcemaps. | [Disable CSS minification](#source-map-can-be-inaccurate-after-minification), rebuild, and collect coverage again. |
| An untested Sass file shows covered lines | Lines outside parsed or mapped CSS rules can appear covered. | Check [byte coverage](#line-coverage-of-untested-preprocessor-sources): it is 0% for untested files included via `all`. |
| `all` cannot parse preprocessor syntax | The file must be compiled to CSS before analysis. | In `all.transformer`, use your CSS preprocessor to set `entry.source` to the compiled CSS, `entry.type` to `'css'`, and `entry.sourceMap` to the matching map. |
| An entire media query or nested block looks covered | Chromium may report coverage for [the whole block](#v8-covered-the-whole-block). | Consider [postcss-atomic-selectors](https://github.com/stephan-dum/postcss-atomic-selectors) as a workaround. |

CSS coverage from multiple bundles is merged as a union for each original source.

## Sass mixins and `@include` {#sass-mixins-and-include}

Sass `@include` can map a generated rule to non-contiguous source locations. When a rule cannot be reliably mapped, MCR reports the **whole bundle as generated CSS** instead of the preprocessor sources. That bundle's coverage is not merged into the original-source coverage.

## Line coverage of untested preprocessor sources {#line-coverage-of-untested-preprocessor-sources}

Untested files included through `all` have `0%` byte coverage, including sourcemap originals. Lines outside parsed or mapped rules (such as variables or unused mixins) may appear covered; use **bytes** coverage for these files.

## Source map can be inaccurate after minification {#source-map-can-be-inaccurate-after-minification}
CSS minification can produce imprecise sourcemaps and trigger fallback to generated CSS. If source mapping is inaccurate, try **disabling CSS minification**.

## V8 covered the whole block {#v8-covered-the-whole-block}

Chromium may mark an entire media query or nested CSS block as covered. Consider [postcss-atomic-selectors](https://github.com/stephan-dum/postcss-atomic-selectors) as a potential workaround.
