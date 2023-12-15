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


const updateTopExecutions = () => {

    const executionCounts = data.executionCounts;
    if (!executionCounts) {
        data.topExecutions = null;
        return;
    }

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

    const coverage = getCoverage(item, content, mapping);

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

    const report = await getReport(item);
    if (!report) {
        console.log(`failed to format source: ${item.sourcePath}`);
        return;
    }

    const { executionCounts } = report.coverage;

    // let uncovered = 0;
    // Object.values(uncoveredLines).forEach((v) => {
    //     if (v === 'uncovered') {
    //         uncovered += 1;
    //         return;
    //     }
    //     if (v === 'partial') {
    //         uncovered += 0.5;
    //     }
    // });

    // uncovered = Math.floor(uncovered);

    // const covered = codeLines - uncovered;

    // const pct = Util.PF(codeLines - uncovered, codeLines, 1, '');
    // const percentChart = Util.generatePercentChart(pct);

    // const lineInfo = {
    //     indicator: 'line',
    //     indicatorName: 'Lines',
    //     total: codeLines,
    //     covered,
    //     coveredClass: covered > 0 ? 'mcr-covered' : '',
    //     uncovered,
    //     uncoveredClass: uncovered > 0 ? 'mcr-uncovered' : '',
    //     pct,
    //     status: Util.getStatus(pct, state.watermarks.lines),
    //     percentChart,
    //     list
    // };

    // console.log('showReport executionCounts', executionCounts);

    data.executionCounts = executionCounts;
    updateTopExecutions();

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
    >
      <VuiSwitch
        v-model="state.formatted"
        :label-clickable="true"
      >
        <b>Pretty Print</b>
      </VuiSwitch>
      <VuiFlex
        v-if="data.topExecutions"
        gap="10px"
        padding="5px"
        wrap
        class="mcr-report-item"
      >
        <div><b>Top Executions</b></div>
        <VuiFlex
          v-for="(item, i) in data.topExecutions"
          :key="i"
          gap="5px"
          class="mcr-top-item"
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

@media (hover: none) {
    .mcr-report-item {
        flex-wrap: nowrap;
        overflow-x: auto;
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

.mcr-covered {
    color: green;
}

.mcr-uncovered {
    color: red;
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
