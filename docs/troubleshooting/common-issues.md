# Common issues {#common-issues}
## Unexpected coverage {#unexpected-coverage}
In most cases, it happens when the coverage of the generated code is converted to the coverage of the original code through a sourcemap. In other words, it's an issue with the sourcemap. Most of the time, we can solve this by setting `minify` to `false` in the configuration of build tools. Let's take a look at an example:
```text
const a = tf ? 'true' : 'false';
               ^     ^  ^
              m1     p  m2
```
In the generated code, there is a position `p`, and we need to find out its corresponding position in the original code. Unfortunately, there is no matched mapping for the position `p`. Instead, it has two adjacent upstream and downstream mappings `m1` and `m2`, so, the original position of `p` that we are looking for, might not be able to be precisely located. Especially, the generated code is different from the original code, such as the code was minified, compressed or converted, it is difficult to find the exact original position without matched mapping.
- Further understanding of sourcemap, try [Debug for Coverage and Sourcemap](/troubleshooting/sourcemaps#debug-for-coverage-and-sourcemap)

How `MCR` Works:
1. Tries to fix the original position with string comparison and [`diff-sequences`](https://github.com/jestjs/jest/tree/main/packages/diff-sequences). However, for non-JS code such as Vue templates or JSX, a perfect solution may not always be possible.
2. Finds all functions, statements and branches by parsing the source code [AST](https://github.com/acornjs/acorn). (One small caveat: V8 cannot provide effective branch coverage information for `AssignmentPattern`.)


## Unparsable source {#unparsable-source}
It happens during the parsing of the source code into AST, if the source code is not in the standard ECMAScript. For example `ts`, `jsx` and so on. There is a option to fix it, which is to manually compile the source code for these files.
```js
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as TsNode from 'ts-node';
const coverageOptions = {
    onEntry: (entry) => {
        const filePath = fileURLToPath(entry.url);
        const originalSource = fs.readFileSync(filePath).toString('utf-8');
        const fileName = path.basename(filePath);
        const tn = TsNode.create({});
        const source = tn.compile(originalSource, fileName);
        entry.fake = false;
        entry.source = source;
    }
};
```

## JavaScript heap out of memory {#javascript-heap-out-of-memory}
When there are a lot of raw v8 coverage files to process, it may cause OOM. We can try the following Node.js options:
```sh
- run: npm run test:coverage
    env:
        NODE_OPTIONS: --max-old-space-size=8192
```
