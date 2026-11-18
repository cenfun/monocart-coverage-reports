# 未测试文件 {#untested-files}
默认不包含未测试文件。使用 `all` 可将它们以 0% 覆盖率加入报告，即使没有采集到任何覆盖率数据也可生成报告。同一原始源码的真实 V8 覆盖率优先于空覆盖率条目。
```js
const coverageOptions = {
    all: './src'

    // 支持多个目录
    // all: ['./src', './lib']
};
```
未测试的文件也适用于`sourceFilter`过滤器. 而且也可以指定自己的`filter`过滤器 (可以返回文件类型来支持js或css的覆盖率格式):
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
可以将未测试的文件转换成 JavaScript，以便进行 AST 分析。以下示例仅处理**不含 JSX 的 TypeScript**，并假定已安装 `@swc/core`。JSX/TSX 或 Vue 应使用匹配的编译器和解析器，这不是通用转换器。保留完整文件路径，避免不同目录下的同名文件冲突；SWC 返回的 sourcemap 是 JSON 字符串，赋值前需要解析。
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
