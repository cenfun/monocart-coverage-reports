# 源码路径 {#resolve-sourcepath-for-the-source-files}
当一个文件从sourcemap解包，它的路径可能是个虚拟路径, 此时可以使用`sourcePath`选项来修改文件路径。比如，我们测试了多个dist包的入口文件，它们的源文件可能包含了一些共同的文件，但路径可能不同，如果我们需要相同的文件覆盖率数据可以自动合并，那么需要使用`sourcePath`来统一这些相同文件的路径
```js
const coverageOptions = {
    sourcePath: (filePath) => {
        // Remove the virtual prefix
        const list = ['my-dist-file1/', 'my-dist-file2/'];
        for (const str of list) {
            if (filePath.startsWith(str)) {
                return filePath.slice(str.length);
            }
        }
        return filePath;
    }
};
```
内置报告路径规范化采用尽力而为的原则，无法完全兼容所有非标准、虚拟或来自其他操作系统的路径。此类特殊情况应通过 `sourcePath` 自行修正，而不是依赖自动推断。回调接收规范化后的 `filePath`；对于 V8 入口和 sourcemap 源文件，`info.url` 提供报告路径规范化前的原始 URL（sourcemap 存在 `sourceRoot` 时包含该前缀）。它修改的是报告路径，不是读取缺失源码时使用的文件系统路径。缺少 `sourcesContent` 时，本地源码相对于外部 map 的 URL 加载（内联 map 则相对于生成文件），并将 `sourceRoot` 作为目录应用。

它也支持简单key/value的替换:
```js
const coverageOptions = {
    sourcePath: {
        'my-dist-file1/': '',
        'my-dist-file2/': ''
    }
};
```
解决文件路径不完整的问题：
```js
import path from 'node:path';

// MCR coverage options
const coverageOptions = {
    sourcePath: (filePath, info) => {
        if (!filePath.includes('/') && info.distFile) {
            return `${path.dirname(info.distFile)}/${filePath}`;
        }
        return filePath;
    }
};
```
