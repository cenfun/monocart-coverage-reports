<script setup>
import {
    ref, watch, inject, onMounted, shallowReactive
} from 'vue';

import { components } from 'vine-ui';
import { microtask } from 'async-tick';

import { createCodeViewer } from 'monocart-code-viewer';
import {
    format, Locator, MappingParser, generateMapping
} from 'monocart-formatter';

import IconLabel from './icon-label.vue';

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

const focusExecution = (item) => {
    const cm = codeViewer.viewer;
    const lineInfo = cm.state.doc.line(item.line);
    const start = lineInfo.from + item.column;
    codeViewer.setSelection(start, item.end);
};

const showNextUncovered = () => {
    let index = data.uncoveredIndex;
    const list = data.uncoveredList;
    const position = list[index];

    // console.log(item);

    const mappingParser = new MappingParser(data.mapping);
    const start = mappingParser.originalToFormatted(position);

    // const cm = codeViewer.viewer;
    codeViewer.setCursor(start);

    // next
    const len = list.length;
    index += 1;
    if (index >= len) {
        index = 0;
    }
    data.uncoveredIndex = index;

};

const updateUncoveredList = (uncoveredPositions) => {
    data.uncoveredIndex = 0;

    if (!uncoveredPositions || !uncoveredPositions.length) {
        data.uncoveredList = null;
        return;
    }

    data.uncoveredList = uncoveredPositions;
};

const updateTopExecutions = (executionCounts) => {

    if (!executionCounts) {
        data.topExecutions = null;
        return;
    }

    const list = [];
    Object.keys(executionCounts).forEach((lineIndex) => {
        const arr = executionCounts[lineIndex];
        arr.forEach((item) => {
            list.push({
                ... item,
                // line index to line number
                line: parseInt(lineIndex) + 1
            });
        });
    });

    if (list.length < 2) {
        data.topExecutions = null;
        return;
    }

    list.sort((a, b) => {
        return b.value - a.value;
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
        const mapping = generateMapping(source, formattedContent);
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

    const cacheKey = ['coverage', 'formatted', state.formatted].join('_');

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
    const formattedLocator = new Locator(content);
    const mappingParser = new MappingParser(mapping);
    const coverage = getCoverage(item, state, mappingParser, formattedLocator);

    const report = {
        coverage,
        content,
        // for cursor change
        mapping
    };

    item[cacheKey] = report;

    // console.log(cacheKey);
    console.log(item);
    // console.log([item.source]);
    // console.log([content]);

    return report;
};

const onCursorChange = (loc) => {

    // \r\n will be replaced with \n even not formatted
    // mapping to original position
    let originalPosition = loc.position;
    if (data.mapping) {
        const mappingParser = new MappingParser(data.mapping);
        originalPosition = mappingParser.formattedToOriginal(loc.position);
        // console.log('cursor location', loc, mappingParser.mapping);
    }

    loc.originalPosition = originalPosition;

    data.cursor = loc;
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

    // report for code viewer {coverage, content}
    const report = await getReport(item);
    if (!report) {
        console.log(`failed to format source: ${item.sourcePath}`);
        return;
    }

    data.mapping = report.mapping;

    const {
        executionCounts, linesSummary, uncoveredPositions
    } = report.coverage;

    updateUncoveredList(uncoveredPositions);

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
        codeViewer.on('cursor', onCursorChange);
    }

    data.cursor = null;

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
          :tooltip="item.name + ' Coverage'"
        >
          {{ Util.PF(item.pct, 100) }}
        </div>
        <VuiFlex
          gap="5px"
          class="mcr-report-values"
        >
          <div
            :class="item.covered?'mcr-covered':''"
            :tooltip="'Covered ' + item.name"
          >
            {{ Util.NF(item.covered) }}
          </div>
          <div
            :class="item.uncovered?'mcr-uncovered':''"
            :tooltip="'Uncovered ' + item.name"
          >
            {{ Util.NF(item.uncovered) }}
          </div>
          <div :tooltip="'Total ' + item.name">
            {{ Util.NF(item.total) }}
          </div>
        </VuiFlex>
        <VuiFlex
          v-if="item.id==='lines'"
          gap="5px"
          class="mcr-report-bc"
        >
          <div tooltip="Blank Lines">
            Blank {{ item.blank }}
          </div>
          <div tooltip="Comment Lines">
            Comment {{ item.comment }}
          </div>
        </VuiFlex>
      </VuiFlex>
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
        @click="focusExecution(item)"
      >
        <div class="mcr-top-count">
          x{{ item.value }}
        </div>
      </VuiFlex>
    </VuiFlex>

    <div
      ref="el"
      class="mcr-report-code vui-flex-auto"
    />

    <VuiFlex
      padding="5px"
      class="mcr-report-foot"
      gap="10px"
    >
      <VuiSwitch
        v-model="state.formatted"
        width="30px"
        height="18px"
        :label-clickable="true"
        label-position="right"
      >
        Format
      </VuiSwitch>
      <IconLabel
        v-if="data.uncoveredList"
        icon="location-hazard"
        size="18px"
        @click="showNextUncovered"
      >
        Uncovered
      </IconLabel>
      <div class="vui-flex-auto" />
      <VuiFlex
        v-if="data.cursor"
        class="mcr-report-cursor"
        gap="10px"
      >
        <div>Line: {{ Util.NF(data.cursor.line) }}</div>
        <div>Column: {{ Util.NF(data.cursor.column) }}</div>
        <div>Original Position: {{ Util.NF(data.cursor.originalPosition) }}</div>
      </VuiFlex>
    </VuiFlex>
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
    cursor: default;

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

.mcr-report-bc {
    color: gray;
    font-size: 12px;
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

    .mcr-top-count {
        padding: 0 3px;
        font-size: 12px;
        font-family: monospace;
        border: 1px solid #4eb62f;
        border-radius: 3px;
        background-color: #e6f5d0;
    }
}

.mcr-report-foot {
    border-top: 1px solid #ddd;
    background-color: #eee;
}

.mcr-report-cursor {
    font-size: 12px;
}

</style>
