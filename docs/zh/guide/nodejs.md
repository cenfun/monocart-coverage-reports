# 采集 Node.js 覆盖率 {#collecting-v8-coverage-data-from-nodejs}
有多种方法可以从Node.js收集V8覆盖率数据:
- [NODE_V8_COVERAGE](https://nodejs.org/docs/latest/api/cli.html#node_v8_coveragedir)=`dir`
    - 使用Node.js环境变量`NODE_V8_COVERAGE`=`dir`来启动程序, 然后在进程正常结束之后，覆盖率数据将自动保存到指定的`dir`目录.
    - 从`dir`目录读取所有的JSON文件，来生成覆盖率报告
    - 参见例子:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-env` node [./test/test-node-env.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-env.js) && node [./test/generate-report.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/generate-report.js)

- [V8](https://nodejs.org/docs/latest/api/v8.html#v8takecoverage) API + NODE_V8_COVERAGE
    - 如果进程不能正常结束，比如被强制关闭，或者压根就不结束，比如启动了一个服务类的，那么需要手动写入覆盖率数据，这里需要调用接口`v8.takeCoverage()`
    - 参见例子:
    > cross-env NODE_V8_COVERAGE=`.temp/v8-coverage-api` node [./test/test-node-api.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-api.js)

- [Inspector](https://nodejs.org/docs/latest/api/inspector.html) API
   - 首先连接到Node.js的V8 inspector
   - 然后使用inspector的覆盖相关API来开启和收集覆盖率数据
   - 参见例子:
   > node [./test/test-node-ins.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-ins.js)
   - vm的例子 (注意这里需要使用`scriptOffset`，因为vm里一般都会加一层包裹代码，需要这个偏移位置来修正覆盖率数据块的位置):
   > node [./test/test-node-vm.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-vm.js)

- [CDP](https://chromedevtools.github.io/devtools-protocol/) API
    - 开启[Node调试](https://nodejs.org/en/guides/debugging-getting-started/)
    - 使用CDP的覆盖率接口开启和收集覆盖率数据
    - 参见例子:
    > node --inspect=9229 [./test/test-node-cdp.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-cdp.js)

- [Node Debugging](https://nodejs.org/en/guides/debugging-getting-started) + CDP + NODE_V8_COVERAGE + V8 API
    - 如果启动了一个Node服务，可以手动调用`v8.takeCoverage()`接口来保存覆盖率数据，开启Node调试就可以远程通过CDP连接的`Runtime.evaluate`，来调用这个接口.
    - 参见[koa](https://github.com/koajs/koa)的例子:
    > node [./test/test-node-koa.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/test/test-node-koa.js)

- [Child Process](https://nodejs.org/docs/latest/api/child_process.html) + NODE_V8_COVERAGE
    - 如果是子进程，可参见 [命令行](/zh/reference/cli#command-line)
