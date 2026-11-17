# Multiple processes {#multiprocessing-support}
> The data will be added to `[outputDir]/.cache`, After the generation of the report, this data will be removed unless debugging has been enabled or a raw report has been used, see [Debug for Coverage and Sourcemap](/troubleshooting/sourcemaps#debug-for-coverage-and-sourcemap)
- Main process, before the start of testing
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
// clean previous cache before the start of testing
// unless the running environment is new and no cache
mcr.cleanCache();
```

- Sub process 1, testing stage 1
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData1);
```

- Sub process 2, testing stage 2
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData2);
```

- Main process, after the completion of testing
```js
// generate coverage reports after the completion of testing
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.generate();
```
