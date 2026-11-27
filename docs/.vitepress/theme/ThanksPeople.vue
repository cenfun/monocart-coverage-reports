<script setup>
defineProps({
    members: {
        type: Array,
        required: true
    }
});
</script>

<template>
  <ul class="people">
    <li
      v-for="member in members"
      :key="member.name"
    >
      <a
        class="profile"
        :href="member.profile"
      >
        <img
          :src="member.avatar"
          alt=""
          width="64"
          height="64"
          loading="lazy"
        >
        <span>{{ member.name }}</span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.people {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 16px;
  max-width: 720px;
  padding: 0;
  list-style: none;
}

.people li {
  margin: 0;
}

.profile {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 12px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  overflow-wrap: anywhere;
  text-align: center;
}

.profile img {
  border-radius: 50%;
  object-fit: cover;
}

.profile:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
