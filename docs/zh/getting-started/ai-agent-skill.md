# AI Agent Skill {#ai-agent-skill}

## 概述 {#overview}

**可靠的 AI 辅助开发离不开自动化测试。** 测试结果验证代码行为，覆盖率帮助识别测试缺口。通过 **`mcr test`**，AI 编程助手可直接运行 Node.js 测试、采集原生 V8 覆盖率并生成报告，无需插桩。测试与覆盖率反馈支持持续迭代，并可结合 CI/CD 质量门禁，用于 AI 辅助或自主开发。

[Monocart Coverage Reports 技能](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/SKILL.md) 指导 AI 配置覆盖率采集和 CLI、排查 sourcemap 问题、合并报告及设置 CI 阈值，适用于 MCR 3.x，专题参考文档按需加载。

## 安装技能 {#installation}

技能随 npm 包发布。将**整个 `skills/monocart-coverage-reports/` 目录**（含 `references/`）复制到 AI 工具的技能目录，或让 AI 直接读取 `SKILL.md`。安装 MCR 不会自动注册技能。技能说明使用英文，与 AI 交流可使用任意语言。

在项目根目录定位已安装的技能：

```sh
node -p "require.resolve('monocart-coverage-reports/skills/monocart-coverage-reports/SKILL.md')"
```

## 使用与参考 {#usage}

按技能中的链接查阅参考文档，并以已安装包的版本和运行环境要求为准。旧版本可能不包含该技能。

开发 MCR 本身时，请参阅 [AGENTS.md](https://github.com/cenfun/monocart-coverage-reports/blob/main/AGENTS.md)。
