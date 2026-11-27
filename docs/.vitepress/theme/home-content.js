import { coverageServiceRepos, frameworkRepos } from './home-integration-repos.js';

const en = {
    projectStats: 'Project badges',
    badges: {
        stars: 'GitHub stars for Monocart Coverage Reports',
        npm: 'Latest npm version',
        license: 'Project license',
        build: 'CI build status',
        npmGraph: 'npm dependency graph',
        dependencies: 'Dependency status',
        downloads: 'Monthly npm downloads for Monocart Coverage Reports'
    },
    skill: 'Let your coding agent set up coverage, troubleshoot collection, and explain the results.',
    workflow: 'Try MCR',
    workflowNote: 'Choose an example or copy a prompt for your AI agent. MCR 3.x requires Node.js 22.18.0 or later; on older versions, use a compatible MCR 2.x release.',
    nodeGuide: 'Run tests with mcr test',
    typescriptGuide: 'Run TypeScript tests',
    playwrightGuide: 'Playwright integration',
    vitestGuide: 'Vitest integration',
    jestGuide: 'Jest integration',
    demoTitle: 'Live Demo',
    previewNote: 'Explore real V8 reports, see what MCR prints in the terminal, or preview Markdown reports as they appear in a GitHub Actions job summary.',
    reportsGuide: 'Explore all report formats',
    report: {
        formats: 'Demo views',
        web: 'Web UI',
        terminal: 'Terminal',
        openReport: 'Open in a new tab',
        loadingReport: 'Checking report availability…',
        missingReport: 'This report is unavailable in this build. If you are running locally, see the examples page for how to generate it.',
        browseExamples: 'Browse report examples',
        terminalNote: 'Captured CLI output from the V8 example. The details report is filtered to three files.',
        markdown: 'Markdown',
        jobSummary: 'GitHub Actions job summary',
        markdownSummaryNote: 'Actual Markdown output from an MCR test run.',
        markdownDetailsNote: 'Excerpt from an MCR test run. File links open the published V8 report.',
        ciRuns: 'View recent CI runs on main',
        examples: {
            v8: 'V8 report (JS)',
            css: 'CSS coverage',
            'node-ts': 'Native TypeScript',
            puppeteer: 'Browser coverage',
            merge: 'Merged coverage',
            esbuild: 'Source maps'
        }
    },
    integrationsTitle: 'Integrate with MCR',
    integrationsNote: 'Generate coverage reports with your existing test tools, then publish the results in GitHub Actions or to a coverage service.',
    integrationsGuide: 'Frameworks and tools',
    coverageServicesGuide: 'Coverage services',
    integrationGuideLabel: 'Read integration guide',
    adoptersTitle: 'Who uses MCR',
    adoptersNote: 'Open-source projects that use MCR for coverage or offer it as an integration.',
    adoptersPrompt: 'Want to generate coverage reports for your own project?',
    adoptersGuide: 'Get started with MCR',
    sitemapTitle: 'Site map'
};

const zh = {
    projectStats: '项目徽章',
    badges: {
        stars: 'Monocart Coverage Reports 的 GitHub 星标数',
        npm: 'npm 最新版本',
        license: '项目许可证',
        build: 'CI 构建状态',
        npmGraph: 'npm 依赖关系图',
        dependencies: '依赖状态',
        downloads: 'Monocart Coverage Reports 的 npm 月下载量'
    },
    skill: '让编程 Agent 帮你接入覆盖率、排查采集问题并解读报告。',
    workflow: '试用 MCR',
    workflowNote: '选择一个示例，或复制提示词交给 AI Agent。MCR 3.x 要求 Node.js 22.18.0 或更高版本；旧版 Node.js 请使用兼容的 MCR 2.x。',
    nodeGuide: '使用 mcr test 运行测试',
    typescriptGuide: '运行 TypeScript 测试',
    playwrightGuide: 'Playwright 集成',
    vitestGuide: 'Vitest 集成',
    jestGuide: 'Jest 集成',
    demoTitle: '在线演示',
    previewNote: '体验真实的 V8 网页报告、查看 MCR 的终端输出，或预览 Markdown 报告在 GitHub Actions 作业摘要中的效果。',
    reportsGuide: '查看全部报告格式',
    report: {
        formats: '演示视图',
        web: 'Web UI',
        terminal: 'Terminal',
        openReport: '在新标签页打开',
        loadingReport: '正在检查报告是否可用…',
        missingReport: '当前构建不包含这份报告。如果你在本地预览，请参阅示例页中的报告生成说明。',
        browseExamples: '浏览报告示例',
        terminalNote: '以下是 V8 示例的实际 CLI 输出，详情报告筛选为三个文件。',
        markdown: 'Markdown',
        jobSummary: 'GitHub Actions 作业摘要',
        markdownSummaryNote: '以下是一次 MCR 测试运行生成的 Markdown 报告。',
        markdownDetailsNote: '以下是一次 MCR 测试运行生成的报告节选。文件链接会打开已发布的 V8 报告。',
        ciRuns: '查看 main 分支最近的 CI 运行',
        examples: {
            v8: 'V8 报告（JS）',
            css: 'CSS 覆盖率',
            'node-ts': '原生 TypeScript',
            puppeteer: '浏览器覆盖率',
            merge: '合并覆盖率',
            esbuild: '源码映射'
        }
    },
    integrationsTitle: '集成 MCR',
    integrationsNote: '用现有测试工具生成覆盖率报告，再在 GitHub Actions 中展示或上传到覆盖率服务。',
    integrationsGuide: '框架与工具',
    coverageServicesGuide: '覆盖率服务',
    integrationGuideLabel: '查看接入指南',
    adoptersTitle: '谁在使用 MCR',
    adoptersNote: '这些开源项目使用 MCR 生成覆盖率报告，或提供 MCR 集成。',
    adoptersPrompt: '想为自己的项目生成覆盖率报告？',
    adoptersGuide: '现在开始使用 MCR',
    sitemapTitle: '站点导航'
};

export const homeContent = {
    en, 'zh-CN': zh
};

const githubAvatar = (owner) => `https://github.com/${owner}.png?size=64`;
const localIcons = {
    'microsoft/playwright': 'playwright',
    'microsoft/TypeScript': 'typescript',
    'microsoft/vscode': 'vscode'
};
const repositoryCard = (docsPage) => ([name, repo, anchor, link = `https://github.com/${repo}`]) => ({
    name,
    link,
    icon: localIcons[repo],
    avatar: githubAvatar(repo.split('/')[0]),
    docsPath: `${docsPage}#${anchor}`
});

export const frameworks = frameworkRepos.map(repositoryCard('/pages/frameworks-and-tools'));

// Keep these in the order of docs/pages/coverage-services.md.
export const coverageServices = [
    {
        name: 'GitHub Actions',
        link: 'https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary',
        avatar: githubAvatar('github'),
        docsPath: '/pages/coverage-services#github-actions'
    },
    ... coverageServiceRepos.map(repositoryCard('/pages/coverage-services'))
];
