<script setup>
import {
    ref, watch, inject, onMounted, shallowReactive
} from 'vue';

import { components } from 'vine-ui';
import { microtask } from 'async-tick';

import { createCodeViewer } from 'monocart-code-viewer';
import {
    format, MappingParser, generateMapping
} from 'monocart-formatter';

import { Locator } from 'monocart-locator';

import IconLabel from './icon-label.vue';

import Util from '../utils/util.js';

import { getCoverage } from '../utils/coverage.js';

const {
    VuiFlex, VuiSwitch, VuiLoading, VuiPopover, VuiInput, VuiButton
} = components;

const state = inject('state');
const tooltip = inject('tooltip');

const data = shallowReactive({
    indexes: {}
});

const emit = defineEmits(['jump']);

const el = ref(null);
let $el;
let codeViewer;

const focusExecution = (item) => {
    const cm = codeViewer.viewer;
    const lineInfo = cm.state.doc.line(item.line);
    const start = lineInfo.from + item.column;
    codeViewer.setSelection(start, Math.min(item.end, data.maxContentLength));
};

const getIndexByPosition = (list) => {
    if (!data.cursor) {
        return;
    }

    if (!data.cursor.original) {
        return;
    }

    const originalPosition = data.cursor.originalPosition;

    const range = data.range;

    let index;
    const item = list.find((it, i) => {
        index = i;

        if (range) {
            if (it.start > range.start) {
                return true;
            }
            if (it.start === range.start && it.end > range.end) {
                return true;
            }
            return false;
        }

        return it.start > originalPosition;
    });

    if (item) {
        return index;
    }
    return 0;
};

const enableLocate = (item) => {
    if (item.id === 'lines') {
        return false;
    }

    if (item.total === 0) {
        return false;
    }

    // bytes has total but possible no ranges
    if (item.id === 'bytes' && !data.item.data.bytes.length) {
        return false;
    }

    if (state.locate === 'Uncovered' && item.uncovered === 0) {
        return false;
    }

    return true;
};

const formatTooltip = (item, key) => {
    const v = item[key];

    if (item.total === 0 && item.empty) {
        return `Unparsable ${item.id}`;
    }

    let value = Util.NF(v);
    if (item.id === 'bytes') {
        value = Util.BSF(v);
    }
    const label = Util.capitalizeFirstLetter(key);
    return `${label} ${item.id} ${value}`;
};

const switchLocate = () => {
    state.locate = state.locate === 'Uncovered' ? 'All' : 'Uncovered';
};

const getLocateDataList = (id) => {
    let dataList = data.item.data[id];
    if (!dataList) {
        return;
    }

    // no ignored and none even is all
    dataList = dataList.filter((it) => !it.ignored && !it.none);

    // console.log(dataList);
    if (state.locate === 'Uncovered') {
        dataList = dataList.filter((it) => it.count === 0);
    }

    if (!Util.isList(dataList)) {
        return;
    }

    return dataList;
};

const getLocateIndex = (key, dataList) => {
    let index = data.indexes[key];
    if (typeof index !== 'number' || index >= dataList.length) {
        index = 0;
    }

    // if same range will be skip to next
    const posIndex = getIndexByPosition(dataList);
    if (typeof posIndex === 'number') {
        index = posIndex;
    }

    return index;
};

const getRangeMapping = (range) => {

    const currentFile = data.item;
    const { files } = state.reportData;

    // original file to generated file
    const distFile = currentFile.distFile;
    if (distFile) {
        if (Util.hasOwn(range, 'generatedStart')) {
            const generatedFile = files.find((file) => {
                return !file.distFile && file.sourcePath === distFile;
            });
            if (generatedFile) {
                return {
                    id: generatedFile.id,
                    sourcePath: distFile,
                    start: range.generatedStart,
                    end: range.generatedEnd
                };
            }
        }
        return;
    }

    // generated file to original file
    const currentPath = currentFile.sourcePath;
    let originalRange;
    const originalFile = files.find((file) => {
        if (file.distFile === currentPath) {
            originalRange = file.data.bytes.find((it) => it.generatedStart === range.start && it.generatedEnd === range.end);
            if (originalRange) {
                return true;
            }
        }
    });

    if (originalRange) {
        return {
            id: originalFile.id,
            sourcePath: originalFile.sourcePath,
            start: originalRange.start,
            end: originalRange.end,
            generatedStart: originalRange.generatedStart,
            generatedEnd: originalRange.generatedEnd
        };
    }

};

const renderRange = (range) => {
    const mappingParser = new MappingParser(data.mapping);
    const start = mappingParser.originalToFormatted(range.start);
    const end = mappingParser.originalToFormatted(range.end);

    new Promise((resolve) => {
        data.resolve = resolve;
        codeViewer.setSelection(start, Math.min(end, data.maxContentLength));
    }).then(() => {
        data.range = range;
        data.rangeMapping = getRangeMapping(range);
    });
};

const showNextRange = (id) => {

    const dataList = getLocateDataList(id);
    if (!dataList) {
        return;
    }

    const key = `${id}_index`;
    let index = getLocateIndex(key, dataList);

    const current = dataList[index];
    if (!current) {
        return;
    }

    // console.log(index);
    // update next index
    const len = dataList.length;
    index += 1;
    if (index >= len) {
        index = 0;
    }
    data.indexes[key] = index;

    // show current data

    renderRange(current);

};

const jumpToRangeMapping = (rangeMapping) => {
    const { files } = state.reportData;
    const item = files.find((it) => it.id === rangeMapping.id);
    if (!item) {
        return;
    }

    // show jump data range
    // console.log(rangeMapping);
    tooltip.visible = false;
    data.autoSelectedRange = rangeMapping;

    // state.flyoverData = item.id;
    emit('jump', item);

};

const showAutoSelectedRange = () => {
    if (!data.autoSelectedRange) {
        return;
    }

    const range = data.autoSelectedRange;
    data.autoSelectedRange = null;

    renderRange(range);

};

const onPopoverOpen = (elem) => {
    setTimeout(() => {
        const input = elem.querySelector('input');
        if (input) {
            input.focus();
        }
    });
};

const closeGoto = () => {
    data.popoverVisible = false;
    data.popoverTarget = null;
};

const onGoKeyDown = (e) => {
    // console.log(e.code);
    if (e.code === 'Escape') {
        // stop flyover close
        e.preventDefault();
        e.stopPropagation();
        closeGoto();
        return;
    }

    if (e.code === 'Enter') {
        onGoClick();
    }
};

const onGoClick = () => {

    closeGoto();

    let pos = data.gotoValue;
    if (data.mapping) {
        const mappingParser = new MappingParser(data.mapping);
        pos = mappingParser.originalToFormatted(pos);
    }

    if (pos < 0) {
        return;
    }
    if (pos >= data.maxContentLength) {
        console.log(`Max length of formatted content is ${data.maxContentLength}`);
        return;
    }

    codeViewer.setCursor(pos);
};

const showGotoPopover = (e) => {
    data.gotoValue = data.cursor.originalPosition;
    data.popoverTarget = e.target;
    data.popoverVisible = true;
};


const updateExecutionCounts = (coverage) => {

    // init
    coverage.executionCounts = {};
    data.topHits = null;

    const { allExecutionCounts } = coverage;
    const allCounts = Object.keys(allExecutionCounts);
    if (!allCounts.length) {
        data.showHits = false;
        return;
    }

    data.showHits = true;
    if (!state.count) {
        return;
    }

    coverage.executionCounts = allExecutionCounts;
    const topHits = [];
    allCounts.forEach((lineIndex) => {
        const arr = allExecutionCounts[lineIndex];
        arr.forEach((item) => {
            topHits.push({
                ... item,
                // line index to line number
                line: parseInt(lineIndex) + 1
            });
        });
    });

    topHits.sort((a, b) => {
        return b.count - a.count;
    });

    const maxNumber = 5;
    if (topHits.length > maxNumber) {
        topHits.length = maxNumber;
    }

    data.topHits = topHits;
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
        const lineBreakPattern = /\r\n|[\r\n\u2028\u2029]/gu;
        const formattedContent = source.replace(lineBreakPattern, '\n');
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

    // for code viewer debug
    // console.log(JSON.stringify({
    //     coverage, content
    // }));


    return report;
};

const onCursorChange = (loc) => {

    // \r\n will be replaced with \n even not formatted
    // mapping to original position
    if (data.mapping) {
        const mappingParser = new MappingParser(data.mapping);
        loc.original = true;
        loc.originalPosition = mappingParser.formattedToOriginal(loc.position);
        // console.log('cursor location', loc, mappingParser.mapping);
    }
    data.range = null;
    data.cursor = loc;
    if (data.resolve) {
        data.resolve();
    }
};

const renderReport = async () => {
    state.loading = true;

    // fixing UI performance issue
    // waiting for the flyover end, after the container size is ready
    if (state.flyoverEndPromise) {
        await state.flyoverEndPromise;
        state.flyoverEndPromise = null;
    }

    const item = data.item;

    const { empty, summary } = item;
    // summary list
    data.summaryList = state.metrics.filter((it) => {
        // no functions,branches for css
        if (!item.js && ['functions', 'branches', 'statements'].includes(it.id)) {
            return false;
        }
        return true;
    }).map((it) => {
        const { id, name } = it;
        const info = {
            id,
            name,
            empty,
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
    data.maxContentLength = report.content.length;

    // console.log('showReport executionCounts', executionCounts);
    updateExecutionCounts(report.coverage);

    const { linesSummary } = report.coverage;
    // update lines summary after formatted
    const lines = data.summaryList.find((it) => it.id === 'lines');
    // lines could NOT be in metrics
    if (lines) {
        Object.keys(linesSummary).forEach((k) => {
            lines[k] = linesSummary[k];
        });

        // compare summary between node and browser calculation
        if (!state.formatted) {
            const originalSummary = item.summary.lines;
            Object.keys(originalSummary).forEach((k) => {
                if (originalSummary[k] !== lines[k]) {
                    console.log('lines', k, 'node', originalSummary[k], '=> ui', lines[k]);
                }
            });
        }
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
    data.range = null;
    data.indexes = {};

    showAutoSelectedRange();

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

watch([
    () => state.formatted,
    () => state.count
], (v) => {
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
          {{ Util.PF(item.pct, 100, 2) }}
        </div>
        <VuiFlex
          gap="5px"
          class="mcr-report-values"
        >
          <div :tooltip="formatTooltip(item, 'covered')">
            <span :class="item.covered?'mcr-covered':''">{{ Util.NF(item.covered) }}</span>
          </div>

          <div
            :class="item.uncovered?'mcr-uncovered':''"
            :tooltip="formatTooltip(item, 'uncovered')"
          >
            {{ Util.NF(item.uncovered) }}
          </div>

          <div :tooltip="formatTooltip(item, 'total')">
            {{ Util.NF(item.total) }}
          </div>

          <IconLabel
            v-if="enableLocate(item)"
            :class="state.locate==='Uncovered'?'mcr-locate-uncovered':''"
            icon="locate"
            @click="showNextRange(item.id)"
          />
        </VuiFlex>

        <VuiFlex
          v-if="item.id==='lines'"
          gap="5px"
          class="mcr-report-bc"
        >
          <div
            v-if="item.blank"
            :tooltip="formatTooltip(item, 'blank')"
          >
            Blank {{ item.blank }}
          </div>
          <div
            v-if="item.comment"
            :tooltip="formatTooltip(item, 'comment')"
          >
            Comment {{ item.comment }}
          </div>
          <div
            v-if="item.skip"
            tooltip="Skip lines"
          >
            Skip {{ item.skip }}
          </div>
        </VuiFlex>
      </VuiFlex>
    </VuiFlex>

    <VuiFlex
      v-if="data.topHits"
      padding="5px"
      class="mcr-report-head"
      wrap
      gap="10px"
    >
      <div><b>Top Hits</b></div>
      <VuiFlex
        v-for="(item, i) in data.topHits"
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
        v-if="data.showHits"
        v-model="state.count"
        width="30px"
        height="18px"
        tooltip="Show Hits"
        :label-clickable="true"
        label-position="right"
      >
        Hits
      </VuiSwitch>

      <VuiSwitch
        v-model="state.formatted"
        width="30px"
        height="18px"
        tooltip="Format Document"
        :label-clickable="true"
        label-position="right"
      >
        Format
      </VuiSwitch>

      <IconLabel
        class="mcr-locate-switch"
        icon="locate"
        :class="state.locate==='Uncovered'?'mcr-locate-uncovered':''"
        tooltip="Switch Locating Between All Ranges or Uncovered Ranges"
        @click="switchLocate()"
      >
        <span>{{ state.locate }}</span>
      </IconLabel>

      <VuiFlex
        v-if="data.range"
        gap="10px"
      >
        <span>{{ Util.NF(data.range.start) }}~{{ Util.NF(data.range.end) }}</span>
        <IconLabel
          v-if="data.rangeMapping"
          icon="link"
          class="mcr-generated-range"
          :tooltip="'Mapping to '+data.rangeMapping.sourcePath"
          @click="jumpToRangeMapping(data.rangeMapping)"
        >
          {{ Util.NF(data.rangeMapping.start) }}~{{ Util.NF(data.rangeMapping.end) }}
        </IconLabel>
      </VuiFlex>

      <div class="vui-flex-auto" />

      <VuiFlex
        v-if="data.cursor"
        center
        gap="10px"
        class="mcr-cursor-foot"
      >
        <div>
          <span tooltip="1-base">Ln {{ Util.NF(data.cursor.line) }}</span>,
          <span tooltip="0-base">Col {{ Util.NF(data.cursor.column) }}</span>
        </div>
        <VuiFlex gap="5px">
          <IconLabel
            icon="location"
            class="mcr-report-goto"
            title="Jump to position"
            @click="showGotoPopover"
          >
            Pos
          </IconLabel>
          <div v-if="data.cursor.original">
            <span :tooltip="'Formatted: ' + Util.NF(data.cursor.position)">{{ Util.NF(data.cursor.originalPosition) }}</span>
          </div>
        </VuiFlex>
      </VuiFlex>

      <IconLabel
        v-if="state.globalError"
        class="mcr-icon-error"
        tooltip="Unknown error"
        icon="error"
      />

      <div class="mcr-about">
        <a
          href="https://github.com/cenfun/monocart-coverage-reports"
          target="_blank"
          tooltip-timeout="30000"
          :tooltip="'Monocart Coverage Reports v'+state.version"
        ><IconLabel
          class="mcr-icon-monocart"
          icon="monocart"
        /></a>
      </div>
    </VuiFlex>
    <VuiPopover
      v-model="data.popoverVisible"
      :target="data.popoverTarget"
      positions="top"
      width="160px"
      @open="onPopoverOpen"
    >
      <VuiFlex
        gap="10px"
        padding="5px"
      >
        <VuiInput
          v-model="data.gotoValue"
          type="number"
          select-on-focus
          @keydown="onGoKeyDown"
        />
        <VuiButton @click="onGoClick">
          Go
        </VuiButton>
      </VuiFlex>
    </VuiPopover>
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

    > div:not(:last-child) {
        padding-right: 5px;
        border-right: 1px solid #ccc;
    }
}

.mcr-report-bc {
    color: gray;
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

.mcr-about {
    a {
        color: #333;
    }
}

.mcr-report-goto {
    cursor: pointer;
}

.mcr-locate-uncovered {
    color: red;
}

.mcr-locate-switch {
    span {
        color: #333;
    }
}

.mcr-cursor-foot {
    span {
        font-size: var(--font-monospace);
        cursor: default;
    }
}

.mcr-generated-range {
    cursor: pointer;
    opacity: 0.8;
}

.mcr-generated-range:hover {
    opacity: 1;
}

.mcr-icon-error {
    color: red;
}

</style>
