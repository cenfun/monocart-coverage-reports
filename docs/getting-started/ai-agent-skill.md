# AI Agent Skill {#ai-agent-skill}

## Overview {#overview}

**Reliable AI-assisted development starts with automated testing.** Test results validate behavior; coverage highlights testing gaps. With **`mcr test`**, AI coding agents can run Node.js tests, collect native V8 coverage, and generate reports without instrumentation. This feedback supports iterative development and CI/CD quality gates, whether an agent assists a developer or works autonomously.

The [Monocart Coverage Reports skill](https://github.com/cenfun/monocart-coverage-reports/blob/main/skills/monocart-coverage-reports/SKILL.md) guides agents through coverage collection, CLI configuration, sourcemap troubleshooting, report merging, and CI thresholds. It targets MCR 3.x and loads task-specific references on demand.

## Installation {#installation}

The skill ships in the npm package. Copy the **entire `skills/monocart-coverage-reports/` directory**, including `references/`, into your agent's skills directory, or have the agent read `SKILL.md` directly. Installation does not automatically register the skill. The instructions are in English; you can use any language with your agent.

Locate the installed skill from your project root:

```sh
node -p "require.resolve('monocart-coverage-reports/skills/monocart-coverage-reports/SKILL.md')"
```

## Usage and references {#usage}

Follow the skill's reference links and the installed package's version and runtime requirements. Older releases may not include the skill.

For development of MCR itself, see [AGENTS.md](https://github.com/cenfun/monocart-coverage-reports/blob/main/AGENTS.md).
