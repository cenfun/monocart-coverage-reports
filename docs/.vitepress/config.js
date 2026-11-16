import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitepress';
import { pages } from './pages.js';
import { reportServer } from './report-server.js';

const repository = 'https://github.com/cenfun/monocart-coverage-reports';
const siteOrigin = 'https://cenfun.github.io';
const socialImage = `${siteOrigin}/monocart-coverage-reports/og-image.png`;
const socialImageAlt = 'Monocart Coverage Reports v3.x — rich native V8 coverage reports for JavaScript and CSS, 15+ built-in reports, AI Agent Skills, and mcr test with the built-in Node.js test runner';
// Reuse the report UI icon; embedding it also works for nested routes and SSR.
const favicon = `data:image/svg+xml;base64,${readFileSync(new URL('../../src/app/images/icons/monocart.svg', import.meta.url)).toString('base64')}`;
const groups = [
    ['start', 'Getting started', '入门'],
    ['guide', 'Guides', '指南'],
    ['reference', 'Reference', '参考'],
    ['integrations', 'Integrations', '集成'],
    ['troubleshooting', 'Troubleshooting', '排障'],
    ['migrations', 'Migration and upgrades', '迁移升级'],
    ['other', 'More', '其他']
];

const theme = (zh) => {
    const label = (en, cn) => (zh ? cn : en);
    const prefix = label('/', '/zh/');
    return {
        nav: [
            {
                text: label('Guide', '指南'), link: `${prefix}guide/getting-started`
            },
            {
                text: 'AI Agent Skill', link: `${prefix}ai-agent-skill`
            },
            {
                text: label('Reference', '参考'), link: `${prefix}reference/options`
            },
            {
                text: label('Integrations', '集成'), link: `${prefix}integrations/overview`
            },
            {
                text: label('Examples', '示例'), link: `${prefix}examples`
            }
        ],
        sidebar: groups.map(([group, en, cn]) => ({
            text: zh ? cn : en,
            collapsed: false,
            items: pages.filter((page) => page[3] === group).map(([route, title, translation]) => ({
                text: label(title, translation),
                link: `${prefix}${route}`
            }))
        })),
        outline: {
            level: [2, 3], label: label('On this page', '本页目录')
        },
        docFooter: {
            prev: label('Previous page', '上一页'), next: label('Next page', '下一页')
        },
        editLink: {
            pattern: `${repository}/edit/main/docs/:path`,
            text: label('Edit this page on GitHub', '在 GitHub 上编辑此页')
        },
        sidebarMenuLabel: label('Menu', '菜单'),
        returnToTopLabel: label('Return to top', '返回顶部'),
        darkModeSwitchLabel: label('Appearance', '外观'),
        langMenuLabel: label('Change language', '切换语言')
    };
};

export default defineConfig({
    title: 'Monocart Coverage Reports',
    description: 'Native V8 coverage for JavaScript, TypeScript & CSS. 15+ built-in reports, Istanbul & custom reports. MCR 3.x: AI Agent Skills, mcr test with the Node.js test runner, source maps, coverage merging & CI integration.',
    base: '/monocart-coverage-reports/',
    outDir: '../.temp/site',
    cacheDir: '../.temp/vitepress-cache',
    // These pages and data files come from integration tests, not Markdown.
    ignoreDeadLinks: [/^\/(?:monocart-coverage-reports\/)?reports(?:\/|$)/],
    locales: {
        root: {
            label: 'English', lang: 'en', themeConfig: theme(false)
        },
        zh: {
            label: '简体中文',
            lang: 'zh-CN',
            description: 'JavaScript、TypeScript 与 CSS 的原生 V8 覆盖率工具。支持 15+ 内置报告、Istanbul 与自定义报告。MCR 3.x 提供 AI Agent Skills、基于 Node.js 测试运行器的 mcr test、源码映射、覆盖率合并与 CI 集成。',
            themeConfig: theme(true)
        }
    },
    themeConfig: {
        socialLinks: [{
            icon: 'github', link: repository
        }],
        search: {
            provider: 'local',
            options: {
                // Index CJK characters separately so Chinese queries do not depend on spaces.
                miniSearch: {
                    options: {
                        tokenize: (text) => text.toLowerCase().match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}_]+/gu) || []
                    }
                },
                locales: {
                    zh: {
                        translations: {
                            button: {
                                buttonText: '搜索文档', buttonAriaLabel: '搜索文档'
                            },
                            modal: {
                                noResultsText: '未找到相关结果',
                                resetButtonTitle: '清除搜索',
                                displayDetails: '显示详情',
                                footer: {
                                    selectText: '选择', navigateText: '切换', closeText: '关闭'
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    head: [
        ['link', {
            rel: 'icon', type: 'image/svg+xml', href: favicon
        }],
        ['meta', {
            name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        }],
        ['meta', {
            name: 'theme-color', content: '#ffffff'
        }],
        ['meta', {
            property: 'og:type', content: 'website'
        }],
        ['meta', {
            property: 'og:site_name', content: 'Monocart Coverage Reports'
        }],
        ['meta', {
            property: 'og:image', content: socialImage
        }],
        ['meta', {
            property: 'og:image:width', content: '1200'
        }],
        ['meta', {
            property: 'og:image:height', content: '630'
        }],
        ['meta', {
            property: 'og:image:type', content: 'image/png'
        }],
        ['meta', {
            property: 'og:image:alt', content: socialImageAlt
        }],
        ['meta', {
            name: 'twitter:card', content: 'summary_large_image'
        }],
        ['meta', {
            name: 'twitter:image', content: socialImage
        }],
        ['meta', {
            name: 'twitter:image:alt', content: socialImageAlt
        }]
    ],
    // Emit page-specific metadata into static HTML: social crawlers need no JavaScript.
    transformHead({
        page, title, description, siteData
    }) {
        const route = page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '.html');
        const url = new URL(`${siteData.base}${route}`, siteOrigin).href;
        return [
            ['meta', {
                property: 'og:title', content: title
            }],
            ['meta', {
                property: 'og:description', content: description
            }],
            ['meta', {
                property: 'og:url', content: url
            }],
            ['meta', {
                property: 'og:locale', content: siteData.lang === 'zh-CN' ? 'zh_CN' : 'en_US'
            }],
            ['meta', {
                name: 'twitter:title', content: title
            }],
            ['meta', {
                name: 'twitter:description', content: description
            }]
        ];
    },
    vite: {
        plugins: [reportServer()],
        build: {
            // Reports share this output directory. Never erase them on a docs rebuild.
            emptyOutDir: false
        },
        server: {
            fs: {
                allow: ['..']
            }
        }
    }
});
