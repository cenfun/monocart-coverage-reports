<script setup>
import { VuiIcon } from 'vine-ui';

defineProps({
    repositories: {
        type: Array, required: true
    }
});

const retryAvatar = ({ currentTarget: img }) => {
    const url = new URL(img.src);
    url.searchParams.set('retry', Date.now());
    img.src = url.href;
};
</script>

<template>
  <ul class="mcr-repo-list">
    <li
      v-for="{ name, avatar, icon, link, external } in repositories"
      :key="link"
    >
      <a
        class="mcr-repo-primary"
        :href="link"
        :target="external ? undefined : '_blank'"
        :rel="external ? undefined : 'noopener noreferrer'"
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
          @error.once="retryAvatar"
        >
        <span>{{ name }}</span>
      </a>
      <a
        v-if="external"
        class="mcr-repo-external"
        :href="external.href"
        :aria-label="external.label"
        :title="external.label"
        target="_blank"
        rel="noopener noreferrer"
      >
        <VuiIcon
          icon="circle-arrow-up-right"
          size="18px"
          aria-hidden="true"
        />
      </a>
    </li>
  </ul>
</template>
