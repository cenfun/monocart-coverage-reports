# 多进程 {#multiprocessing-support}
> 多进程支持可以很好的解决异步并行的情况。所有的覆盖率数据会保存到`[outputDir]/.cache`，在报告生成之后，这些缓存数据会被清除。除非开启了[调试模式](/zh/troubleshooting/sourcemaps#debug-for-coverage-and-sourcemap)，或者使用了`raw`报告
- 主进程，初始化，清理之前的缓存
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
// clean previous cache before the start of testing
// unless the running environment is new and no cache
mcr.cleanCache();
```

- 子进程1, 测试业务1
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData1);
```

- 子进程2, 测试业务2
```js
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.add(coverageData2);
```

- 主进程，所有测试完成之后
```js
// generate coverage reports after the completion of testing
import { MCR } from 'monocart-coverage-reports';
import coverageOptions from 'path-to/same-options.js';
const mcr = MCR(coverageOptions);
await mcr.generate();
```
