# V8 vs Istanbul {#v8-vs-istanbul}
> If the V8 data format is used for Istanbul reports, it will be automatically converted from V8 to Istanbul.

| | Istanbul | V8 | V8 to Istanbul |
| :--------------| :------ | :------ | :----------------------  |
| Coverage data | [Istanbul](https://github.com/gotwarlost/istanbul/blob/master/coverage.json.md) (Object) | [V8](/reference/coverage-data#v8-coverage-data) (Array) | [V8](/reference/coverage-data#v8-coverage-data) (Array) |
| Output | [Istanbul reports](/reference/reports#reports) | [V8 reports](/reference/reports#reports)  | [Istanbul reports](/reference/reports#reports) |
| - Bytes | ❌ | ✅ | ❌ |
| - Statements | ✅ | ✅ | ✅ |
| - Branches | ✅ | ✅ | ✅ |
| - Functions | ✅ | ✅ | ✅ |
| - Lines | ✅ | ✅ | ✅ |
| - Execution counts | ✅ | ✅ | ✅ |
| CSS coverage | ❌ | ✅ | ✅ |
| Minified code | ❌ | ✅ | ❌ |
