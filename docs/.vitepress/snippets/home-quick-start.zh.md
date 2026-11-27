::: code-group

```sh [Node.js]
# 在项目根目录运行，按实际的 node:test 文件调整匹配规则。
npx --package=monocart-coverage-reports mcr test "./test/**/*.test.js"
```

```sh [TypeScript]
# 运行仅使用 Node.js 可擦除类型语法的 node:test 文件。
npx --package=monocart-coverage-reports mcr test "./test/**/*.test.ts"
```

```sh [Playwright]
# 在新目录中运行完整的 Chromium 覆盖率示例。
git clone https://github.com/cenfun/playwright-coverage.git
cd playwright-coverage
npm install
npx playwright install chromium
npm test
# 打开 coverage-reports/index.html。
```

```js [Vitest]
// 在已有 Vitest 项目中安装：npm i -D vitest-monocart-coverage
// 将以下配置合并到 vitest.config.js，然后运行：npx vitest run --coverage
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'custom',
            customProviderModule: 'vitest-monocart-coverage'
        }
    }
});
```

```js [Jest]
// 在已有 Jest 项目中安装：npm i -D jest-monocart-coverage
// 将以下配置合并到 jest.config.mjs，然后运行：npx jest
export default {
    collectCoverage: true,
    coverageProvider: 'v8',
    coverageReporters: ['none'],
    reporters: [
        'default',
        ['jest-monocart-coverage', {
            reports: ['v8', 'console-summary'],
            outputDir: './coverage-reports/jest'
        }]
    ]
};
```

```text [AI Agent]
请用 Monocart Coverage Reports（MCR）3.x 为当前项目添加或完善覆盖率。
先确认 Node.js 版本，沿用项目现有的测试运行器和包管理器。
如果已安装 MCR，请先阅读随包附带的 monocart-coverage-reports 技能。
运行相关测试，确认报告包含预期的源文件，并告知我运行命令、报告路径和主要覆盖缺口。
不要靠放宽断言、调整阈值或排除源码来提高覆盖率。
```

:::
