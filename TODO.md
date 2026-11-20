# TODO

- [ ] Match captured sources to the correct execution, not just the URL (`lib/generate.js`, `readSourceList()`). This is a pre-existing issue, not a native TS regression.

  Reproduce:
  1. Run `subject.ts` with MCR's register hook and `NODE_V8_COVERAGE` enabled.
  2. Change its source and run it again using the same coverage directory.
  3. Generate a report with `addFromDir()`.

  Actual: one captured source can silently be used for both executions.
  Expected: associate each execution with its source, or report ambiguity.
  Workaround: collect different builds in separate directories and call `addFromDir()` for each.
