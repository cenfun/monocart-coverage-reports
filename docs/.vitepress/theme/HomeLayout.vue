<script setup>
import { computed, defineAsyncComponent } from 'vue';
import DefaultTheme from 'vitepress/theme';
import {
    useData, useRouter, withBase
} from 'vitepress';
import heroArt from '../../../assets/hero-art.svg';
import QuickStartEn from '../snippets/home-quick-start.en.md';
import QuickStartZh from '../snippets/home-quick-start.zh.md';
import RepositoryList from './RepositoryList.vue';
import adopterCards from '../../../scripts/who/who.filterred.json';
import {
    coverageServices, frameworks, homeContent
} from './home-content.js';
import { excludeIntegrationRepos } from './home-integration-repos.js';

const adopters = excludeIntegrationRepos(adopterCards);
const ReportPreview = defineAsyncComponent(() => import('./ReportPreview.vue'));
// Feature a short list on the homepage; the Examples page has the full catalog.
const webReports = ['v8', 'css', 'node-ts', 'puppeteer', 'merge', 'esbuild'];

const npmPackage = 'https://www.npmjs.com/package/monocart-coverage-reports';
// Match the README badges except for the downloads image, which does not load on the docs site.
const badges = [{
    id: 'stars',
    src: 'https://img.shields.io/github/stars/cenfun/monocart-coverage-reports?style=flat&logo=github',
    href: 'https://github.com/cenfun/monocart-coverage-reports'
}, {
    id: 'npm',
    src: 'https://img.shields.io/npm/v/monocart-coverage-reports',
    href: npmPackage
}, {
    id: 'license',
    src: 'https://img.shields.io/github/license/cenfun/monocart-coverage-reports'
}, {
    id: 'build',
    src: 'https://img.shields.io/github/actions/workflow/status/cenfun/monocart-coverage-reports/ci.yml'
}, {
    id: 'npmGraph',
    src: 'https://img.shields.io/badge/npm-graph-blue',
    href: 'https://npmgraph.js.org/?q=monocart-coverage-reports'
}, {
    id: 'dependencies',
    src: 'https://img.shields.io/librariesio/github/cenfun/monocart-coverage-reports'
}, {
    id: 'downloads',
    src: 'https://img.shields.io/npm/dm/monocart-coverage-reports?style=flat&logo=npm',
    href: npmPackage
}];

const {
    frontmatter, lang, localeIndex, site, theme
} = useData();
const router = useRouter();
const landing = computed(() => frontmatter.value.mcrHome);
const copy = computed(() => homeContent[lang.value] ?? homeContent.en);
const quickStart = computed(() => (lang.value === 'zh-CN' ? QuickStartZh : QuickStartEn));
const documentLink = (path) => withBase(site.value.cleanUrls ? path : path.replace(/(?=#|$)/, '.html'));
const localLink = (path) => {
    const prefix = localeIndex.value === 'root' ? '' : `/${localeIndex.value}`;
    return documentLink(`${prefix}${path}`);
};
const integrationCards = (cards) => cards.map((card) => ({
    ... card,
    guide: {
        href: localLink(card.docsPath),
        label: `${copy.value.integrationGuideLabel}: ${card.name}`
    }
}));
// Pointer clicks on desktop group buttons open the first page. Keep keyboard
// activation and mobile disclosure buttons unchanged so every page is reachable.
const openFirstNavItem = (event) => {
    if (event.detail === 0) {
        return;
    }
    const button = event.target.closest?.('.VPNavBarMenuGroup > .button');
    const link = button?.parentElement.querySelector('.menu a[href]');
    if (!link) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    return router.go(link.href);
};
</script>

<template>
  <DefaultTheme.Layout @click.capture="openFirstNavItem">
    <template #home-hero-info-before>
      <span class="mcr-version">MCR 3.x</span>
    </template>
    <template #home-hero-image>
      <picture>
        <source
          media="(prefers-reduced-motion: reduce)"
          :srcset="`${heroArt}#static`"
        >
        <img
          class="mcr-hero-art"
          :src="heroArt"
          alt=""
          width="272"
          height="272"
        >
      </picture>
    </template>
    <template #home-hero-actions-after>
      <template v-if="landing">
        <p class="mcr-skill-note">
          <strong>AI Agent Skill:</strong> {{ copy.skill }}
        </p>
        <ul
          class="mcr-badges"
          :aria-label="copy.projectStats"
        >
          <li
            v-for="badge in badges"
            :key="badge.id"
          >
            <component
              :is="badge.href ? 'a' : 'span'"
              :href="badge.href"
            >
              <img
                :src="badge.src"
                :alt="copy.badges[badge.id]"
                height="20"
              >
            </component>
          </li>
        </ul>
      </template>
    </template>
    <template #home-hero-after>
      <div
        v-if="landing"
        class="mcr-home-wrap"
      >
        <section
          class="mcr-try"
          aria-labelledby="mcr-try-title"
        >
          <div class="mcr-section-intro">
            <h2 id="mcr-try-title">
              {{ copy.workflow }}
            </h2>
            <p>{{ copy.workflowNote }}</p>
          </div>
          <div class="vp-doc">
            <component :is="quickStart" />
          </div>
          <div class="mcr-try-guides">
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/node-test-runner#quick-start')"
            >{{ copy.nodeGuide }}</a>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/typescript#run-ts-tests')"
            >{{ copy.typescriptGuide }}</a>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/frameworks-and-tools#playwright')"
            >{{ copy.playwrightGuide }}</a>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/frameworks-and-tools#vitest')"
            >{{ copy.vitestGuide }}</a>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/frameworks-and-tools#jest')"
            >{{ copy.jestGuide }}</a>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/ai-agent-skill')"
            >AI Agent Skill</a>
          </div>
        </section>
        <section
          class="mcr-showcase mcr-section"
          aria-labelledby="live-demo"
        >
          <div class="mcr-section-intro">
            <h2 id="live-demo">
              {{ copy.demoTitle }}
            </h2>
            <p>{{ copy.previewNote }}</p>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/reports')"
            >{{ copy.reportsGuide }} <span aria-hidden="true">→</span></a>
          </div>
          <ReportPreview
            :examples="webReports"
            :examples-href="localLink('/pages/examples')"
            :labels="copy.report"
          />
        </section>
      </div>
    </template>
    <template #home-features-after>
      <div
        v-if="landing"
        class="mcr-home-wrap"
      >
        <section
          class="mcr-section"
          aria-labelledby="mcr-integrations"
        >
          <div class="mcr-section-intro">
            <h2 id="mcr-integrations">
              {{ copy.integrationsTitle }}
            </h2>
            <p>{{ copy.integrationsNote }}</p>
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/frameworks-and-tools')"
            >{{ copy.integrationsGuide }} <span aria-hidden="true">→</span></a>
          </div>
          <RepositoryList :repositories="integrationCards(frameworks)" />
          <div class="mcr-coverage-services">
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/coverage-services')"
            >{{ copy.coverageServicesGuide }} <span aria-hidden="true">→</span></a>
            <RepositoryList :repositories="integrationCards(coverageServices)" />
          </div>
        </section>
        <section
          v-if="adopters.length"
          class="mcr-section mcr-adopters"
          aria-labelledby="who-uses-mcr"
        >
          <div class="mcr-section-intro">
            <h2 id="who-uses-mcr">
              {{ copy.adoptersTitle }}
            </h2>
            <p>{{ copy.adoptersNote }}</p>
          </div>
          <RepositoryList :repositories="adopters" />
          <p class="mcr-adopters-cta">
            {{ copy.adoptersPrompt }}
            <a
              class="mcr-inline-link"
              :href="localLink('/pages/get-started')"
            >{{ copy.adoptersGuide }} <span aria-hidden="true">→</span></a>
          </p>
        </section>
      </div>
    </template>
    <template #layout-bottom>
      <footer
        v-if="landing"
        class="mcr-footer"
      >
        <div class="mcr-home-wrap">
          <nav :aria-label="copy.sitemapTitle">
            <div class="mcr-sitemap-groups">
              <div
                v-for="{ text, items } in theme.sidebar"
                :key="text"
                class="mcr-sitemap-group"
              >
                <h3>{{ text }}</h3>
                <ul>
                  <li
                    v-for="item in items"
                    :key="item.link"
                  >
                    <a :href="documentLink(item.link)">{{ item.text }}</a>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
          <p class="mcr-footer-copyright">
            MIT License · Copyright (c) 2023-present cenfun
          </p>
        </div>
      </footer>
    </template>
  </DefaultTheme.Layout>
</template>
