---
layout: home
hero:
  name: Monocart Coverage Reports
  text: 丰富直观的<span class="mcr-accent">原生 V8 覆盖率报告。</span>
  tagline: >
    15+ 内置报告 · Istanbul 报告 · 自定义 Reporter<br>
    JavaScript、TypeScript 与 CSS，原生字节级覆盖率统计。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: AI Agent Skill
      link: /zh/ai-agent-skill
    - theme: alt
      text: 示例
      link: /zh/examples
workflow:
  label: 内置测试运行器 · 始于 v3.0.0
  link: /zh/guide/node-test-runner
  runner: Node.js 内置测试运行器
  description: 运行测试、采集 V8 覆盖率、自动生成报告。
  capabilitiesLabel: 探索 MCR 功能
  capabilities:
    - text: AI Agent Skill
      link: /zh/ai-agent-skill
    - text: 浏览器与 Node.js
      link: /zh/guide/v8
    - text: Source maps
      link: /zh/troubleshooting/sourcemaps
    - text: 合并覆盖率
      link: /zh/guide/merging
    - text: CI 集成
      link: /zh/integrations/examples
features:
  - title: AI Agent Skill
    details: 为 AI 编程助手提供可复用的测试、覆盖率采集、Sourcemap 排障与 CI 阈值检查流程。随 npm 包发布，支持离线使用。
    link: /zh/ai-agent-skill
    linkText: 为 Agent 配置 Skill
  - title: 原生 V8 覆盖率
    details: 无需插桩，从 Node.js 或 Chromium 采集覆盖率，提供原生字节级统计和可交互的报告。
    link: /zh/guide/v8
    linkText: 了解 V8 覆盖率
  - title: 15+ 内置报告
    details: 生成 V8、Istanbul、LCOV、控制台和 Markdown 报告，也可通过自定义 Reporter 适配现有流程。
    link: /zh/reference/reports
    linkText: 选择报告格式
  - title: 浏览器与 Node.js
    details: 接入 Node.js 测试运行器、Playwright、Puppeteer 及现有测试框架，无需替换已有测试流程。
    link: /zh/integrations/overview
    linkText: 接入测试框架
  - title: Sourcemap 与合并
    details: 将构建后的代码映射回原始源码，合并多轮测试、多进程和 CI 分片的覆盖率数据。
    link: /zh/guide/merging
    linkText: 合并覆盖率
  - title: CI 质量门禁
    details: 在 CI 服务中跟踪覆盖率，通过 Hooks 检查阈值并保留失败状态，避免测试或报告错误被掩盖。
    link: /zh/reference/hooks
    linkText: 设置覆盖率阈值
---
