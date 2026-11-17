# 过滤覆盖率 {#filtering-results}

## entryFilter + sourceFilter {#using-entryfilter-and-sourcefilter-to-filter-the-results-for-v8-report}

使用 `entryFilter` 和 `sourceFilter` 过滤 V8 报告中的入口文件与源文件。

`entryFilter` 回调的参数 [`entry`](/zh/reference/types#v8coverageentry) 类型为 `V8CoverageEntry`；`sourceFilter` 接收源码路径字符串。

当收集到V8的覆盖数据时，它实际上包含了所有的入口文件的覆盖率数据, 比如有以下3个文件:

- *dist/main.js*
- *dist/vendor.js*
- *dist/something-else.js*

这个时候可以使用`entryFilter`来过滤这些入口文件. 比如我们不需要看到`vendor.js`和`something-else.js`的覆盖率，就可以过滤掉，只剩下1个文件

- *dist/main.js*

如果一个入口文件存在行内或者链接的sourcemap文件，那么我们会尝试读取并解析sourcemap，以获取入口文件包含的所有源文件，并添加到列表。此时如果`logging`没有设置成`debug`，那么这个入口文件在成功解出源文件后会被移除

- *src/index.js*
- *src/components/app.js*
- *node_modules/dependency/dist/dependency.js*

这个时候可以使用`sourceFilter`来过滤这些源文件。比如我们不需要看到源文件`dependency.js`的覆盖率，就可以过滤掉，最后只剩下如下文件

- *src/index.js*
- *src/components/app.js*

过滤可以使用函数:
```js
const coverageOptions = {
    entryFilter: (entry) => entry.url.indexOf('main.js') !== -1,
    sourceFilter: (sourcePath) => sourcePath.search(/src\//) !== -1
};
```
也可以使用便捷的[`minimatch`](https://github.com/isaacs/minimatch)来匹配（推荐）:
```js
const coverageOptions = {
    entryFilter: '**/main.js',
    sourceFilter: '**/src/**'
};
```
支持多个匹配:
```js
const coverageOptions = {
    entryFilter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/src/**': true
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/**': true
    }
};
```
作为CLI参数（JSON字符串，Added in: v2.8）:
```sh
mcr --sourceFilter "{'**/node_modules/**':false,'**/**':true}"
```
注意，这些匹配实际上会转换成一个过滤函数（如下），所以如果一个匹配成功则会直接返回，后面的将不再继续匹配。请注意先后顺序，如果存在包含关系的，可以调整上下顺序，最后如果都未匹配，则默认返回false
```js
const coverageOptions = {
    entryFilter: (entry) => {
        if (minimatch(entry.url, '**/node_modules/**')) {
            return false;
        }
        if (minimatch(entry.url, '**/vendor.js')) {
            return false;
        }
        if (minimatch(entry.url, '**/src/**')) {
            return true;
        }
        // else unmatched
        return false;
    }
};
```

## filter {#using-filter-instead-of-entryfilter-and-sourcefilter}

如果你不想定义两个过滤器，可以使用 `filter` 选项代替，可以将多个匹配合并在一起. (Added in: v2.8)
```js
const coverageOptions = {
    // combined patterns
    filter: {
        '**/node_modules/**': false,
        '**/vendor.js': false,
        '**/src/**': true,
        '**/**': true
    }
};
```

## outputFilter {#使用-outputfilter-过滤最终文件}

使用 `outputFilter` 过滤最终文件列表。

> **版本要求：** `outputFilter` 是 **v3.0.0** 新增的选项，v2.13.x 及更早版本不支持。

对于 V8 输入，`outputFilter` 同时作用于 V8 报告和转换后的 Istanbul 报告。默认值为 `null`，不启用过滤。

它与 `entryFilter` 和 `sourceFilter` 使用相同的字符串和有序对象匹配规则：按顺序返回第一个匹配项的值，未匹配的文件不保留。匹配目标是经过 `sourcePath` 改写后的最终路径。函数形式接收最终文件对象 [`entry`](/zh/reference/types#coveragefile)（`CoverageFile`），而不是路径字符串。

```js
const coverageOptions = {
    outputFilter: {
        '**/node_modules/**': false,
        '**/src/**': true
    }
};
// 也可以使用：
// outputFilter: '**/src/**'
// outputFilter: (entry) => entry.sourcePath.startsWith('src/')
```

命令行示例（使用引号避免 shell 展开匹配规则）：
```sh
mcr merge --inputDir ./raw --outputFilter "**/src/**"
mcr merge --inputDir ./raw --outputFilter "{'**/node_modules/**':false,'**/src/**':true}"
```

`outputFilter` 不改变 raw 原始覆盖率导出，也不适用于 Istanbul 格式的输入数据。

## 如何选择和组合过滤方案 {#choose-filtering-approach}

可以根据需要，单独选择输入过滤（`entryFilter` + `sourceFilter`）或输出过滤（`outputFilter`），两套方案各有优劣，也支持混合使用。合并选项 `filter` 只是 `entryFilter` + `sourceFilter` 的简写，不会配置 `outputFilter`。

| 方案 | 过滤时机和对象 | 优点 | 代价与注意事项 |
| :-- | :-- | :-- | :-- |
| `entryFilter` + `sourceFilter`（或 `filter`） | 从输入端过滤：在发现入口文件时，`entryFilter` 按 URL 过滤；在 sourcemap 解包源文件时，`sourceFilter` 按源路径过滤。 | 尽早排除不需要的文件，减少后续无效处理，性能更高。大型项目或 bundle 较多时，优先推荐此方案。 | 需要区分入口文件和 sourcemap 源文件，并配置两个阶段的规则。如果通过 `entryFilter` 排除整个 bundle，其中需要保留的源文件也会一起丢失。 |
| `outputFilter` | 从输出结果过滤：在 sourcemap 转换、合并和添加未测试文件（`all`）完成后、生成报告前，按最终 `sourcePath` 过滤。 | 配置更简单，一套规则直接面向最终文件列表，无需区分入口文件和解包后的源文件。 | 不需要的文件在被丢弃前仍会经历前期发现和处理，无法节省这些开销。当最终排除的文件较多时，可能带来明显的生成耗时和内存开销，存在性能问题。 |

**单独使用时：** 优先考虑性能，选择输入过滤（`entryFilter` + `sourceFilter`，或 `filter`）；更看重配置简单、希望直接过滤最终结果，且可以接受额外处理成本时，选择 `outputFilter`。

**也可以混合使用两套方案**，但规则重叠或冲突时容易误删文件，需要明确各阶段的职责。例如，使用 `entryFilter` 保留需要处理的 bundle，使用 `sourceFilter` 排除已知不需要的源文件，再使用 `outputFilter` 按改写后的最终 `sourcePath` 筛选报告文件。

输入过滤先执行，`outputFilter` 只对处理后的最终文件列表继续筛选，无法恢复已被 `entryFilter` 或 `sourceFilter` 排除的源文件。尤其要注意，排除整个 bundle 也会排除其中的源文件。混用时应分别检查入口 URL、sourcemap 源路径和最终路径，确保每个阶段的规则都符合预期。
