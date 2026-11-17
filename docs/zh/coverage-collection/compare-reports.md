# V8 与 Istanbul 对比 {#compare-reports}
> 如果是V8数据格式使用Istanbul的报告，将自动从V8转换到Istanbul

| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| 数据格式 | [Istanbul](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md) (Object) | [V8](/zh/reference/coverage-data#v8-coverage-data-api) (Array) | [V8](/zh/reference/coverage-data#v8-coverage-data-api) (Array) |
| 输出报告 | [Istanbul reports](/zh/reference/reports#available-reports) | [V8 reports](/zh/reference/reports#available-reports)  | [Istanbul reports](/zh/reference/reports#available-reports) |
| - Bytes 字节覆盖率 | ❌ | ✅ | ❌ |
| - Statements 语句覆盖率 | ✅ | ✅ | ✅ |
| - Branches 分支覆盖率 | ✅ | ✅ | ✅ |
| - Functions 函数覆盖率 | ✅ | ✅ | ✅ |
| - Lines 行覆盖率 | ✅ | ✅ | ✅ |
| - Execution counts 函数执行数 | ✅ | ✅ | ✅ |
| CSS 覆盖率 | ❌ | ✅ | ✅ |
| 压缩过的代码 | ❌ | ✅ | ❌ |
