<script setup>
import {
    ref, watch, inject, onMounted, shallowReactive
} from 'vue';

import { components } from 'vine-ui';
import { microtask } from 'async-tick';

import { createCodeViewer } from 'monocart-code-viewer';
import { format, Mapping } from 'monocart-formatter';

import Util from '../utils/util.js';

import { getCoverage } from '../utils/coverage.js';

const {
    VuiFlex, VuiSwitch, VuiLoading
} = components;

const state = inject('state');

const data = shallowReactive({

});

const el = ref(null);
let $el;
let codeViewer;

const scrollToLine = (line) => {
    if (codeViewer) {
        const viewer = codeViewer.viewer;
        const top = (line - 1) * viewer.defaultLineHeight;
        if (top >= 0) {
            viewer.scrollDOM.scrollTo({
                top,
                behavior: 'auto'
            });
        }
    }
};


const updateTopExecutions = (executionCounts) => {

    if (!executionCounts) {
        data.topExecutions = null;
        return;
    }

    data.executionCounts = executionCounts;

    const list = [];
    Object.keys(executionCounts).forEach((line) => {
        const arr = executionCounts[line];
        arr.forEach((item) => {
            list.push({
                // line index to line number
                line: parseInt(line) + 1,
                count: item.value
            });
        });
    });

    if (!list.length) {
        data.topExecutions = null;
        return;
    }

    list.sort((a, b) => {
        return b.count - a.count;
    });

    const maxNumber = 5;
    if (list.length > maxNumber) {
        list.length = maxNumber;
    }

    data.topExecutions = list;
};

const autoDetectType = (item) => {
    const {
        type, source, originalType
    } = item;

    if (originalType) {
        return originalType;
    }

    const regS = /^\s*</;
    const regE = />\s*$/;
    if (regS.test(source) && regE.test(source)) {
        item.originalType = 'html';
        return 'html';
    }

    return type;
};

const formatSource = (item) => {
    const source = item.source;

    // console.log('formatSource', state.formatted);

    // no format for distFile item, may vue format or others
    if (!state.formatted) {
        // codemirror will replace all \r\n to \n, so end position will be mismatched
        // just replace all \r\n with \n
        const formattedContent = source.replace(Util.lineBreakPattern, '\n');
        const mapping = Mapping.generate(source, formattedContent);
        // console.log(mapping);
        return {
            content: formattedContent,
            mapping
        };
    }

    let type = item.type;
    if (item.distFile) {
        type = autoDetectType(item);
    }

    return format(source, type);
};

const getReport = async (item) => {

    const cacheKey = ['report', 'formatted', state.formatted].join('_');

    if (item[cacheKey]) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(item[cacheKey]);
            });
        });
    }

    const res = await formatSource(item);
    if (res.error) {
        console.log(res.error.message);
        return;
    }

    const { content, mapping } = res;

    const coverage = getCoverage(item, state, content, mapping);

    // console.log(cacheKey);
    console.log(coverage);
    // console.log([item.source]);
    // console.log([content]);

    const report = {
        coverage,
        content
    };

    item[cacheKey] = report;

    return report;
};

const renderReport = async () => {
    state.loading = true;

    const item = data.item;

    const summary = item.summary;
    // summary list
    data.summaryList = state.indicators.filter((it) => {
        // no functions for css
        if (!item.js && it.id === 'functions') {
            return false;
        }
        return true;
    }).map((it) => {
        const { id, name } = it;
        const info = {
            id,
            name,
            ... summary[id]
        };
        if (id === 'lines') {
            // could be updated after formatted
            return shallowReactive(info);
        }
        return info;
    });

    // console.log(data.summaryList);

    const report = await getReport(item);
    if (!report) {
        console.log(`failed to format source: ${item.sourcePath}`);
        return;
    }

    const { executionCounts, linesSummary } = report.coverage;
    // console.log('showReport executionCounts', executionCounts);
    updateTopExecutions(executionCounts);

    // update lines summary after formatted
    const lines = data.summaryList.find((it) => it.id === 'lines');
    Object.keys(linesSummary).forEach((k) => {
        lines[k] = linesSummary[k];
    });


    if (!state.formatted) {
        // compare summary between node and browser calculation
        const originalSummary = item.summary.lines;
        Object.keys(originalSummary).forEach((k) => {
            if (originalSummary[k] !== lines[k]) {
                console.log(k, originalSummary[k], '!=', lines[k]);
            }
        });
    }

    // for code viewer debug
    // console.log(report);

    if (codeViewer) {
        codeViewer.update(report);
    } else {
        codeViewer = createCodeViewer($el, report);
    }

    state.loading = false;
};

const renderReportAsync = microtask(renderReport);

const showReport = () => {
    const id = state.flyoverData;
    if (!id) {
        return;
    }
    const item = state.fileMap[id];

    data.item = item;

    renderReportAsync();
};


watch(() => state.flyoverData, (v) => {
    showReport();
});

watch(() => state.formatted, (v) => {
    if (!state.flyoverData) {
        return;
    }

    renderReportAsync();
});

onMounted(() => {
    $el = el.value;
});

</script>

<template>
  <VuiFlex
    direction="column"
    class="mcr-report"
  >
    <VuiFlex
      direction="row"
      padding="5px"
      class="mcr-report-head"
      wrap
      gap="10px"
    >
      <VuiFlex
        v-for="(item) in data.summaryList"
        :key="item.id"
        direction="row"
        gap="5px"
      >
        <b>{{ item.name }}</b>
        <div
          v-if="(typeof item.pct === 'number')"
          :class="'mcr-report-percent mcr-'+item.status"
        >
          {{ Util.PF(item.pct, 100) }}
        </div>
        <VuiFlex
          gap="5px"
          class="mcr-report-values"
        >
          <div :class="item.covered?'mcr-covered':''">
            {{ Util.NF(item.covered) }}
          </div>
          <div :class="item.uncovered?'mcr-uncovered':''">
            {{ Util.NF(item.uncovered) }}
          </div>
          <div>{{ Util.NF(item.total) }}</div>
        </VuiFlex>
        <VuiFlex
          v-if="item.id==='lines'"
          gap="5px"
        >
          <div>Blank</div>
          <div>{{ item.blank }}</div>
          <div>Comment</div>
          <div>{{ item.comment }}</div>
        </VuiFlex>
      </VuiFlex>
      <VuiSwitch
        v-model="state.formatted"
        :label-clickable="true"
        label-position="right"
      >
        Format
      </VuiSwitch>
    </VuiFlex>

    <VuiFlex
      v-if="data.topExecutions"
      padding="5px"
      class="mcr-report-head"
      wrap
      gap="10px"
    >
      <div><b>Top Executions</b></div>
      <VuiFlex
        v-for="(item, i) in data.topExecutions"
        :key="i"
        class="mcr-top-item"
        wrap
        gap="5px"
        @click="scrollToLine(item.line)"
      >
        <div class="mcr-top-line">
          L{{ item.line }}
        </div>
        <div class="mcr-top-count">
          x{{ item.count }}
        </div>
      </VuiFlex>
    </VuiFlex>

    <div
      ref="el"
      class="mcr-report-code vui-flex-auto"
    />
    <VuiLoading
      center
      :visible="state.loading"
    />
  </VuiFlex>
</template>

<style lang="scss">
.mcr-report {
    position: relative;
    height: 100%;
}

.mcr-report-head {
    width: 100%;
    border-bottom: 1px solid #dae9fa;
    background-color: #eef6ff;

    a {
        word-break: break-all;
    }
}

.mcr-report-percent {
    padding: 0 3px;
    border-radius: 3px;
}

.mcr-report-values {
    padding: 0 3px;
    border: 1px solid #ccc;
    border-radius: 3px;

    div:not(:last-child) {
        padding-right: 5px;
        border-right: 1px solid #ccc;
    }
}

.mcr-report-code {
    position: relative;
}

.mcr-top-number {
    width: 42px;

    .vui-select-view {
        min-width: 42px;
        text-align: center;
    }
}

.mcr-top-item {
    cursor: pointer;

    &:hover {
        .mcr-top-line {
            text-decoration: underline;
        }
    }

    .mcr-top-count {
        padding: 0 3px;
        font-size: 12px;
        font-family: monospace;
        border: 1px solid #4eb62f;
        border-radius: 3px;
        background-color: #e6f5d0;
    }
}

</style>
