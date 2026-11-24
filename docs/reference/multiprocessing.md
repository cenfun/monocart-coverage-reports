# Multiple processes {#multiple-processes}
Use this workflow for processes that can share one `outputDir/.cache`. For CI shards, containers, or machines without a shared cache, [export and merge raw reports](/reference/merging#manual-merging) instead. Successful generation removes the cache unless debug logging is enabled; exporting a `raw` report moves the cache to the raw output location.

## Workflow {#workflow}

The subprocesses run in parallel and write to the same cache. Report generation starts only after all subprocesses have finished writing.

```mermaid
flowchart TD
    accTitle: Multiprocess coverage workflow
    accDescr: The main process initializes the cache, subprocesses collect coverage in parallel, and the main process generates the report after all writes finish.
    init["Step 1: Main process initializes / cleanCache()"]
    subgraph workers["Step 2: Parallel collection"]
        worker1["Subprocess 1 / await add(coverageData1)"]
        worker2["Subprocess 2 / await add(coverageData2)"]
    end
    cache[("Shared outputDir/.cache")]
    wait["Wait for all subprocesses to finish writing"]
    report["Step 3: Main process / await generate()"]
    init --> worker1
    init --> worker2
    worker1 --> cache
    worker2 --> cache
    cache --> wait
    wait --> report
```

## Step 1: Initialize the main process {#initialize}

```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
// clean previous cache before the start of testing
// unless the running environment is new and no cache
mcr.cleanCache();
```

## Step 2: Collect coverage in parallel {#collect-in-subprocesses}

Subprocesses can run concurrently. Use the same `outputDir` (an absolute path if working directories differ) and leave [`cleanCache: false`](/reference/options#cleancache). Do not clear the cache or generate reports while collection is running.

### Subprocess 1 {#subprocess-1}

```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData1);
```

### Subprocess 2 {#subprocess-2}

```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData2);
```

## Step 3: Generate the report in the main process {#generate-report}

Wait for all subprocesses to finish writing coverage data before calling `generate()` once in the main process.

```js
// generate coverage reports after the completion of testing
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.generate();
```
