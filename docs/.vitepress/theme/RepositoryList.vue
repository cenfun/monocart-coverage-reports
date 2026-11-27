<script setup>
import { VuiIcon } from 'vine-ui';

defineProps({
    repositories: {
        type: Array, required: true
    }
});
</script>

<template>
  <ul class="mcr-repo-list">
    <li
      v-for="{ name, avatar, icon, link, guide } in repositories"
      :key="link"
    >
      <a
        class="mcr-repo-primary"
        :href="link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <VuiIcon
          v-if="icon"
          class="mcr-repo-avatar"
          :icon="icon"
          size="32px"
          aria-hidden="true"
        />
        <img
          v-else
          class="mcr-repo-avatar"
          :src="avatar"
          alt=""
          width="32"
          height="32"
          loading="lazy"
        >
        <span>{{ name }}</span>
      </a>
      <a
        v-if="guide"
        class="mcr-repo-guide"
        :href="guide.href"
        :aria-label="guide.label"
        :title="guide.label"
      >
        <VuiIcon
          icon="arrow-right"
          aria-hidden="true"
        />
      </a>
    </li>
  </ul>
</template>
