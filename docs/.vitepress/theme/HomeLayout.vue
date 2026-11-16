<script setup>
import DefaultTheme from 'vitepress/theme';
import { useData, withBase } from 'vitepress';
import logo from '../../../src/app/images/icons/monocart.svg';

const { frontmatter } = useData();
</script>

<template>
  <DefaultTheme.Layout>
    <template #home-hero-info-before>
      <span class="mcr-version">MCR 3.x · Node.js ≥ 22.15.0</span>
    </template>
    <template #home-hero-image>
      <img
        class="mcr-logo"
        :src="logo"
        alt="Monocart"
        width="230"
        height="230"
      >
    </template>
    <template #home-hero-after>
      <section
        v-if="frontmatter.workflow"
        class="mcr-workflow"
        :aria-label="frontmatter.workflow.label"
      >
        <a
          class="mcr-command"
          :href="withBase(frontmatter.workflow.link)"
        >
          <div class="mcr-command-main">
            <span class="mcr-command-label">{{ frontmatter.workflow.label }}</span>
            <code><span
              class="mcr-prompt"
              aria-hidden="true"
            >$ </span>npx mcr test "*.test.js"</code>
          </div>
          <div class="mcr-command-description">
            <span>{{ frontmatter.workflow.runner }} · <strong>node --test</strong></span>
            <span>{{ frontmatter.workflow.description }}</span>
          </div>
        </a>
        <ul
          class="mcr-capabilities"
          :aria-label="frontmatter.workflow.capabilitiesLabel"
        >
          <li
            v-for="item in frontmatter.workflow.capabilities"
            :key="item.link"
          >
            <a :href="withBase(item.link)">{{ item.text }}</a>
          </li>
        </ul>
      </section>
    </template>
  </DefaultTheme.Layout>
</template>
