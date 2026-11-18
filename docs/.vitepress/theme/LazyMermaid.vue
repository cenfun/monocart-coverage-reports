<script setup>
import {
    computed, onMounted, onUnmounted, ref, watch
} from 'vue';
import { useData } from 'vitepress';

const props = defineProps({
    graph: {
        type: String,
        required: true
    }
});
const { isDark, lang } = useData();
const mounted = ref(false);
const svg = ref('');
const failed = ref(false);
const source = computed(() => decodeURIComponent(props.graph));
const status = computed(() => {
    if (failed.value) {
        return lang.value.startsWith('zh') ? '图表加载失败，显示源码。' : 'Unable to load diagram. Source shown below.';
    }
    return lang.value.startsWith('zh') ? '正在加载图表…' : 'Loading diagram…';
});
let revision = 0;

watch([mounted, source, isDark], async () => {
    const current = ++revision;
    if (!mounted.value) {
        return;
    }
    failed.value = false;
    try {
        const { renderDiagram } = await import('./mermaid-renderer.js');
        if (current !== revision) {
            return;
        }
        const result = await renderDiagram(source.value, isDark.value);
        if (current === revision) {
            svg.value = result.svg;
        }
    } catch (error) {
        if (current === revision) {
            svg.value = '';
            failed.value = true;
            console.error('Unable to render Mermaid diagram:', error);
        }
    }
});

onMounted(() => {
    // Render every diagram on this page, including those below the fold. This
    // avoids delaying them until scrolling or leaving them unloaded for print.
    mounted.value = true;
});

onUnmounted(() => {
    revision++;
});
</script>

<template>
  <div :class="{ 'mcr-mermaid-loading': !svg && !failed }">
    <!-- eslint-disable vue/no-v-html -- Mermaid sanitizes SVG with securityLevel: strict. -->
    <div
      v-if="svg"
      v-html="svg"
    />
    <!-- eslint-enable vue/no-v-html -->
    <template v-else>
      <p role="status">
        {{ status }}
      </p>
      <pre v-if="failed"><code>{{ source }}</code></pre>
    </template>
  </div>
</template>

<style scoped>
/* Reduce the initial height change without constraining the rendered SVG. */
.mcr-mermaid-loading {
    display: grid;
    min-height: 20rem;
    place-items: center;
}
</style>
