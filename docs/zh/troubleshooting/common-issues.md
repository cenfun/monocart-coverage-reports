# 常见问题 {#common-issues}
> 常见问题
## Unexpected coverage {#unexpected-coverage}
覆盖率看起来不正确，多数情况是因为sourcemap转换的问题导致的. 可以先尝试设置构建工具的 `minify=false` 也就是不要压缩代码来解决。下面来看看sourcemap存在问题的具体原因：
```text
const a = tf ? 'true' : 'false';
               ^     ^  ^
              m1     p  m2
```
上面是经过构建工具编译过的代码，通过AST分析，位置`p`对应的原始位置是我们要找的，而从sourcemap里仅能找到离`p`最近的位置映射`m1`和`m2`，也就是位置`p`并没有精确的映射保存到sourcemap里，从而无法直接获取精确的原始位置，但我们能知道`p`的原始位置应该在`m1`和`m2`之间。
- 参见 [Sourcemap 与调试](/zh/troubleshooting/sourcemaps#sourcemaps-and-debugging)

`MCR`如何解决这个问题:
- 1, 首先会尝试使用[`diff-sequences`](https://github.com/jestjs/jest/tree/main/packages/diff-sequences)工具来比较`m1`和`m2`之间的生成代码和原始代码，找到`p`对应的字符位置，可以解决绝大多数问题。但是如果代码是非JS格式的，比如Vue模板是HTML，或JSX这些，不管怎么比较也是很难精确找到对应位置的，甚至此时的sourcemap本身都比较乱。
- 2, 然后就是通过分析[AST](https://github.com/acornjs/acorn)，找到所有的functions, statements 和 branches，因为V8覆盖率本身不提供这些指标的覆盖率. (对于分支覆盖暂不支持`AssignmentPattern`类型，因为即使分析AST也无法从V8覆盖率找到它的数据)。


## Unparsable source {#unparsable-source}
源码无法解析问题。由上面我们知道`MCR`通过分析源码的AST获取更多指标的覆盖率信息，但源码如果不是标准的 ECMAScript，比如`ts`, `jsx`这些，那么分析的时候就会报错，此时我们可以手动来编译这些文件（可行但不推荐）.
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
内存溢出问题可能出现在有太多的原生V8覆盖率文件要处理. 我们可以使用Node.js的一个选项来增加内存使用:
```sh
- run: npm run test:coverage
    env:
        NODE_OPTIONS: --max-old-space-size=8192
```
