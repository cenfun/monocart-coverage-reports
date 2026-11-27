<script setup>
import { computed, useId } from 'vue';
import Details from './samples/coverage-details.md';
import Summary from './samples/coverage-summary.md';

const props = defineProps({
    format: {
        type: String, required: true
    },
    labels: {
        type: Object, required: true
    }
});

const headingId = useId();
const isDetails = computed(() => props.format === 'markdown-details');
const ciRunsUrl = 'https://github.com/cenfun/monocart-coverage-reports/actions/workflows/ci.yml?query=branch%3Amain';
</script>

<template>
  <div class="markdown-panel">
    <div class="job-summary">
      <div class="job-summary-header">
        <strong>{{ labels.jobSummary }}</strong>
        <code>{{ isDetails ? 'coverage-details.md' : 'coverage-summary.md' }}</code>
      </div>
      <h4 :id="headingId">
        My MCR Coverage Report
      </h4>
      <div
        class="markdown-scroll"
        role="region"
        :aria-labelledby="headingId"
        tabindex="0"
      >
        <Details v-if="isDetails" />
        <Summary v-else />
      </div>
    </div>
    <p class="markdown-note">
      {{ isDetails ? labels.markdownDetailsNote : labels.markdownSummaryNote }}
      <a
        :href="ciRunsUrl"
        target="_blank"
        rel="noopener noreferrer"
      >{{ labels.ciRuns }} <span aria-hidden="true">↗</span></a>
    </p>
  </div>
</template>

<style scoped>
.markdown-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
}

.job-summary {
    min-width: 0;
    border: 1px solid var(--vp-c-divider);
    border-radius: var(--mcr-radius-control);
}

.job-summary-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 4px 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vp-c-divider);
    border-radius: var(--mcr-radius-control) var(--mcr-radius-control) 0 0;
    background: var(--vp-c-bg-soft);
    font-size: 13px;
}

.job-summary-header code {
    color: var(--vp-c-text-2);
    font-size: 12px;
}

.job-summary h4 {
    margin: 12px 12px 8px;
    font-size: 18px;
    font-weight: 650;
}

.markdown-scroll {
    overflow-x: auto;
    margin: 0 12px 12px;
}

.markdown-scroll :deep(table) {
    border-collapse: collapse;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.markdown-scroll :deep(th),
.markdown-scroll :deep(td) {
    padding: 5px 10px;
    border: 1px solid var(--vp-c-divider);
    white-space: nowrap;
}

.markdown-scroll :deep(thead),
.markdown-scroll :deep(tbody tr:nth-child(even)) {
    background: var(--vp-c-bg-soft);
}

.markdown-note {
    color: var(--vp-c-text-2);
    font-size: 13px;
}

.markdown-note a,
.markdown-scroll :deep(a) {
    color: var(--vp-c-brand-1);
    text-decoration: underline;
    text-underline-offset: 3px;
}
</style>
