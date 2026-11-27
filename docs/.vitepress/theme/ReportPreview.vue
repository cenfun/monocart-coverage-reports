<script setup>
import {
    computed, onMounted, ref, useId, watch
} from 'vue';
import { withBase } from 'vitepress';
import MarkdownReportPreview from './MarkdownReportPreview.vue';
import { terminalSamples } from './report-sample.js';

const props = defineProps({
    examples: {
        type: Array, required: true
    },
    examplesHref: {
        type: String, required: true
    },
    labels: {
        type: Object, required: true
    }
});

const id = useId();
const terminalFormats = Object.keys(terminalSamples);
const markdownFormats = ['markdown-summary', 'markdown-details'];
const pickerGroups = computed(() => [
    [props.labels.web, props.examples.map((key) => [key, props.labels.examples[key]])],
    [props.labels.terminal, terminalFormats.map((key) => [key, key])],
    [props.labels.markdown, markdownFormats.map((key) => [key, key])]
]);

const selected = ref(props.examples[0]);
const status = ref('loading');
const frameLoaded = ref(false);
const isMarkdownReport = computed(() => markdownFormats.includes(selected.value));
const isWebReport = computed(() => props.examples.includes(selected.value));
const reportHref = computed(() => (isWebReport.value ? withBase(`/reports/${selected.value}/index.html`) : null));
const previewTitle = computed(() => props.labels.examples[selected.value] ?? selected.value);
const showPoster = computed(() => selected.value === 'v8' && status.value !== 'missing' && !frameLoaded.value);

// iframe load events do not distinguish a successful response from an HTTP 404.
onMounted(() => {
    watch(reportHref, async (href, _, onCleanup) => {
        status.value = 'loading';
        frameLoaded.value = false;
        if (!href) {
            return;
        }
        const controller = new AbortController();
        const { signal } = controller;
        onCleanup(() => controller.abort());
        try {
            const response = await fetch(href, {
                method: 'HEAD', signal
            });
            if (!signal.aborted) {
                status.value = response.ok ? 'ready' : 'missing';
            }
        } catch {
            if (!signal.aborted) {
                status.value = 'missing';
            }
        }
    }, {
        immediate: true
    });
});
</script>

<template>
  <div class="report-preview">
    <div
      class="report-picker"
      role="group"
      :aria-label="labels.formats"
    >
      <details
        v-for="([title, options]) in pickerGroups"
        :key="title"
        open
      >
        <summary>
          {{ title }}
        </summary>
        <ul>
          <li
            v-for="([key, label]) in options"
            :key="key"
          >
            <button
              type="button"
              :aria-controls="`${id}-result`"
              :aria-pressed="selected === key"
              @click="selected = key"
            >
              <strong>{{ label }}</strong>
            </button>
          </li>
        </ul>
      </details>
    </div>

    <section
      :id="`${id}-result`"
      :aria-labelledby="`${id}-title`"
      class="report-viewer"
    >
      <div class="report-toolbar">
        <h3 :id="`${id}-title`">
          {{ previewTitle }}
        </h3>
        <a
          v-if="isWebReport && status !== 'missing'"
          :href="reportHref"
          target="_blank"
          rel="noopener noreferrer"
        >{{ labels.openReport }} <span aria-hidden="true">↗</span></a>
      </div>
      <div
        v-if="isWebReport"
        class="report-frame"
      >
        <iframe
          v-if="status === 'ready'"
          :key="reportHref"
          :class="{ 'report-frame-loading': showPoster }"
          :src="reportHref"
          :title="previewTitle"
          loading="lazy"
          @load.once="frameLoaded = true"
        />
        <div
          v-else-if="!showPoster"
          class="report-placeholder"
        >
          <p role="status">
            {{ status === 'missing' ? labels.missingReport : labels.loadingReport }}
          </p>
          <a
            v-if="status === 'missing'"
            :href="examplesHref"
          >{{ labels.browseExamples }}</a>
        </div>
        <img
          v-if="showPoster"
          class="report-poster"
          :src="withBase('/images/v8.gif')"
          alt=""
        >
      </div>
      <MarkdownReportPreview
        v-else-if="isMarkdownReport"
        :format="selected"
        :labels="labels"
      />
      <div
        v-else
        class="terminal-panel"
      >
        <p>{{ labels.terminalNote }}</p>
        <pre
          :aria-labelledby="`${id}-title`"
          tabindex="0"
        ><code><span
          v-for="({ text, color }, index) in terminalSamples[selected]"
          :key="index"
          :class="color"
        >{{ text }}</span></code></pre>
      </div>
    </section>
  </div>
</template>

<style scoped>
.report-preview {
    --frame-height: clamp(440px, 72svh, 700px);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    padding: 8px;
    border: 1px solid var(--vp-c-divider);
    border-radius: var(--mcr-radius-card);
    background: var(--vp-c-bg-soft);
}

.report-picker {
    display: grid;
    gap: 6px;
}

.report-picker details {
    border: 1px solid var(--vp-c-divider);
    border-radius: var(--mcr-radius-control);
    background: var(--vp-c-bg);
}

.report-picker summary {
    padding: 8px 10px;
    font-size: 14px;
    font-weight: 650;
    cursor: pointer;
}

.report-picker ul {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 0 6px 6px;
}

.report-picker button {
    display: block;
    width: 100%;
    height: 100%;
    padding: 7px 9px;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 6px;
}

.report-picker button:hover,
.report-picker button[aria-pressed='true'] {
    color: var(--vp-c-brand-1);
    border-color: var(--vp-c-divider);
    background: var(--vp-c-brand-soft);
}

.report-picker strong {
    display: block;
    font-size: 13px;
    line-height: 1.5;
}

.report-viewer {
    border: 1px solid var(--vp-c-divider);
    border-radius: var(--mcr-radius-control);
    background: var(--vp-c-bg);
}

.report-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 12px;
    padding: 7px 12px;
    font-size: 13px;
    font-weight: 600;
    border-bottom: 1px solid var(--vp-c-divider);
}

.report-toolbar h3 {
    font: inherit;
}

.report-toolbar a,
.report-placeholder a {
    color: var(--vp-c-brand-1);
    text-decoration: underline;
    text-underline-offset: 3px;
}

.report-frame {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    width: 100%;
    min-height: var(--frame-height);
    /* Use the available width to match v8.gif, not the minimum height to expand the width. */
    aspect-ratio: 810 / 600;
}

.report-frame > * {
    grid-area: 1 / 1;
}

.report-frame iframe,
.report-poster {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0 0 calc(var(--mcr-radius-control) - 1px) calc(var(--mcr-radius-control) - 1px);
}

.report-frame-loading {
    visibility: hidden;
}

.report-poster {
    object-fit: contain;
}

.report-placeholder {
    display: grid;
    gap: 8px;
    align-content: center;
    justify-items: center;
    padding: 16px;
    color: var(--vp-c-text-2);
    text-align: center;
}

.terminal-panel > p {
    padding: 8px 12px;
    color: var(--vp-c-text-2);
    font-size: 13px;
}

.terminal-panel pre {
    padding: 12px;
    overflow: auto;
    color: #e6edf3;
    font: 13px/1.55 var(--vp-font-family-mono);
    tab-size: 4;
    border-radius: 0 0 calc(var(--mcr-radius-control) - 1px) calc(var(--mcr-radius-control) - 1px);
    background: #101316;
}

.ansi-red { color: #ff938d; }
.ansi-green { color: #7ee787; }
.ansi-yellow { color: #f5ce71; }
.ansi-cyan { color: #79d9ee; }

@media (max-width: 759px) and (orientation: portrait) {
    .report-preview {
        --frame-height: clamp(480px, 82svh, 760px);
    }
}

@media (min-width: 760px) {
    .report-preview {
        grid-template-columns: minmax(170px, 1fr) minmax(0, 4fr);
    }

    .report-picker ul {
        grid-template-columns: 1fr;
    }
}
</style>
