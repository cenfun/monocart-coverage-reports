<script setup>
import {
    shallowReactive, onMounted, reactive, provide, watch, watchEffect
} from 'vue';
import { components, generateTooltips } from 'vine-ui';

import { Grid } from 'turbogrid';
import inflate from 'lz-utils/inflate';
import { microtask, debounce } from 'async-tick';

import hash from './core/hash.js';
import store from './core/store.js';

import Util from './utils/util.js';

import Flyover from './components/flyover.vue';
import Report from './components/report.vue';
import IconLabel from './components/icon-label.vue';

import faviconIcon from './images/icons/monocart.svg';

const {
    VuiFlex,
    VuiInput,
    VuiSwitch,
    VuiSelect,
    VuiTooltip,
    VuiLoading
} = components;


const allMetrics = [{
    id: 'bytes',
    name: 'Bytes',
    metrics_width: 88,
    collapsed_width: 80,
    expanded_width: 70
}, {
    id: 'statements',
    name: 'Statements',
    metrics_width: 75,
    collapsed_width: 120,
    expanded_width: 70
}, {
    id: 'branches',
    name: 'Branches',
    metrics_width: 75,
    collapsed_width: 120,
    expanded_width: 70
}, {
    id: 'functions',
    name: 'Functions',
    metrics_width: 75,
    collapsed_width: 100,
    expanded_width: 70
}, {
    id: 'lines',
    name: 'Lines',
    metrics_width: 81,
    collapsed_width: 80,
    expanded_width: 70
}];

// =================================================================================
// do not use reactive for grid data
const state = shallowReactive({
    title: 'Coverage Report',
    metrics: [],
    summary: {},

    group: true,
    formatted: false,
    count: true,
    locate: 'Uncovered',

    keywords: '',

    watermarks: {
        bytes: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        statements: [50, 80],
        lines: [50, 80]
    },
    watermarkLow: true,
    watermarkMedium: true,
    watermarkHigh: true,
    watermarkType: 'bytes',
    watermarkOptions: allMetrics.map((it) => {
        return {
            label: it.name,
            value: it.id
        };
    }),

    windowWidth: window.innerWidth,

    // flyover detail
    flyoverVisible: false,
    flyoverWidth: '60%',
    flyoverTitle: '',
    flyoverComponent: '',
    flyoverData: null,

    grid: null,
    gridDataCache: {},

    loading: false,
    initializing: true

});

provide('state', state);

const tooltip = reactive({
    visible: false,
    target: null,
    text: '',
    html: false
});

watchEffect(() => {
    let t = state.title;
    if (state.flyoverVisible) {
        t = `${Util.getSourceName(state.flyoverTitle)} - ${t}`;
    }
    document.title = t;
});

// =================================================================================

const hideTooltip = () => {
    tooltip.visible = false;
    tooltip.target = null;
    tooltip.text = '';
};

let timeout_tooltip;
const showTooltip = (target, text) => {
    clearTimeout(timeout_tooltip);

    if (Util.isTouchDevice()) {
        hideTooltip();
        return;
    }

    if (!text) {
        hideTooltip();
        return;
    }

    tooltip.target = target;
    tooltip.text = text;
    tooltip.visible = true;

    const timeout = parseInt(target.getAttribute('tooltip-timeout')) || 2000;

    timeout_tooltip = setTimeout(() => {
        hideTooltip();
    }, timeout);
};

const initTooltip = () => {
    generateTooltips((target, text) => {
        showTooltip(target, text);
    }, (target) => {
        hideTooltip();
    });
};

const isNodeTruncated = (node) => {
    if (!node) {
        return false;
    }
    // name and url
    node = node.querySelector('.tg-tree-name') || node;
    // console.log(node.clientWidth, node.scrollWidth);
    if (node.clientWidth < node.scrollWidth) {
        // console.log('isNodeTruncated');
        return true;
    }
    return false;
};

// =================================================================================

const initFlyoverSize = () => {
    state.windowWidth = window.innerWidth;

    let flyoverWidth = '60%';
    if (state.windowWidth < 600) {
        flyoverWidth = '100%';
    } else if (state.windowWidth < 800) {
        flyoverWidth = '80%';
    }
    state.flyoverWidth = flyoverWidth;
};

const hideFlyover = () => {
    state.flyoverVisible = false;
    state.flyoverData = null;
};

const showFlyover = (rowItem) => {

    if (!state.flyoverVisible) {
        state.flyoverEndPromise = new Promise((resolve) => {
            state.flyoverEndResolve = resolve;
        });
    }

    state.flyoverData = rowItem.id;

    let ft = rowItem.sourcePath;
    const df = rowItem.distFile;
    if (df) {
        ft = `${df}: ${ft}`;
    }

    state.flyoverTitle = ft;
    state.flyoverVisible = true;
    hash.set('page', rowItem.id);
};

const displayFlyoverWithHash = () => {

    const page = hash.get('page');
    if (page) {
        const grid = state.grid;
        if (grid) {
            const rowItem = grid.getRowItemById(page);
            if (rowItem) {
                grid.scrollRowIntoView(rowItem);
                grid.setRowSelected(rowItem);
                showFlyover(rowItem);
                return;
            }
        }
    }

    hideFlyover();

};

const onHeaderClick = (grid, columnItem) => {
    const { id } = columnItem;
    const isMetrics = allMetrics.find((it) => it.id === id);
    if (!isMetrics) {
        return;
    }

    const collapsed = !columnItem.collapsed;
    columnItem.collapsed = collapsed;

    const ids = columnItem.subs.map((it) => it.id).filter((it) => !it.endsWith('_pct'));

    const pctItem = columnItem.subs.find((it) => it.id.endsWith('_pct'));
    if (pctItem) {
        pctItem.width = collapsed ? isMetrics.collapsed_width : isMetrics.expanded_width;
    }

    if (collapsed) {
        grid.hideColumn(ids);
    } else {
        grid.showColumn(ids);
    }

    store.set(`collapsed_${id}`, collapsed);
};

const onRowClick = (grid, rowItem, columnItem) => {
    if (rowItem.isSummary || rowItem.subs) {
        return;
    }

    grid.setRowSelected(rowItem);

    if (state.flyoverVisible) {
        showFlyover(rowItem);
        return;
    }
    if (columnItem.id === 'name') {
        showFlyover(rowItem);
    }
};

const plusColumnWidth = (e, grid, columnItem) => {
    e.preventDefault();
    e.stopPropagation();
    grid.setColumnWidth(columnItem, columnItem.tg_width + 100);
    grid.scrollToColumn(columnItem);
};

// =================================================================================

const bindGridEvents = (grid) => {

    grid.bind('onCellMouseEnter', (e, d) => {
        const { cellNode } = d;
        if (isNodeTruncated(cellNode)) {
            showTooltip(d.e.target, cellNode.innerText);
        }
    }).bind('onCellMouseLeave', (e, d) => {
        hideTooltip();
    });

    grid.bind('onClick', (e, d) => {

        const {
            cellNode, rowItem, columnItem, headerNode
        } = d;

        // for column header
        if (headerNode) {

            const target = d.e.target;

            if (target.className === 'mcr-url-plus') {
                plusColumnWidth(d.e, grid, columnItem);
                return;
            }

            onHeaderClick(grid, columnItem);
            return;
        }

        // for row
        if (cellNode) {
            onRowClick(grid, rowItem, columnItem);
        }

    });

    grid.bind('onFirstUpdated', (e) => {
        displayFlyoverWithHash();
    });
};

const mergeSingleSubGroups = (item) => {

    if (!item.subs) {
        return;
    }
    if (item.subs.length === 1) {
        const sub = item.subs[0];
        if (!sub.subs) {
            return;
        }
        item.name = [item.name, sub.name].filter((it) => it).join('/');
        item.subs = sub.subs;
        mergeSingleSubGroups(item);
        return;
    }

    item.subs.forEach((sub) => {
        mergeSingleSubGroups(sub);
    });

};

const initGroupMetrics = (group) => {
    allMetrics.map((it) => it.id).forEach((id) => {
        group[`${id}_total`] = 0;
        group[`${id}_covered`] = 0;
        if (id === 'lines') {
            group[`${id}_blank`] = 0;
            group[`${id}_comment`] = 0;
        }
    });
};

// calculate groups
const calculateGroups = (list, group) => {
    if (!list) {
        return;
    }

    if (typeof group.bytes_total !== 'number') {
        initGroupMetrics(group);
    }

    list.forEach((item) => {
        // sub group
        if (typeof item.bytes_total !== 'number') {
            calculateGroups(item.subs, item);
        }

        if (item.debug) {
            return;
        }

        allMetrics.map((it) => it.id).forEach((id) => {
            group[`${id}_total`] += item[`${id}_total`];
            group[`${id}_covered`] += item[`${id}_covered`];

            if (id === 'lines') {
                group[`${id}_blank`] += item[`${id}_blank`];
                group[`${id}_comment`] += item[`${id}_comment`];
            }
        });

    });

    // calculate group
    allMetrics.map((it) => it.id).forEach((id) => {
        const total = group[`${id}_total`];

        const covered = group[`${id}_covered`];
        group[`${id}_uncovered`] = total - covered;

        let pct = '';
        let status = 'unknown';

        if (total) {
            pct = Util.PNF(covered, total, 2);
            status = Util.getStatus(pct, state.watermarks[id]);
        }

        group[`${id}_pct`] = pct;
        group[`${id}_chart`] = pct;
        group[`${id}_status`] = status;
        group[`${id}_pctClassMap`] = `mcr-${status}`;

    });

};

const getGroupRows = (summaryRows) => {
    let groups = [];

    summaryRows.forEach((summaryItem) => {
        const sourcePath = summaryItem.sourcePath;
        const pathList = sourcePath.split('/');

        const lastName = pathList.pop();

        let subs = groups;
        pathList.forEach((key) => {
            const item = subs.find((it) => it.name === key && it.subs);
            if (item) {
                subs = item.subs;
                return;
            }
            const sub = {
                name: key,
                subs: []
            };
            subs.push(sub);
            subs = sub.subs;
        });

        subs.push({
            ... summaryItem,
            name: lastName
        });

    });

    const group = {
        subs: groups
    };
    mergeSingleSubGroups(group);

    if (group.name) {
        groups = [group];
    }

    const groupSummary = {};
    calculateGroups(groups, groupSummary);
    // console.log(groupSummary);

    return groups;
};

const getFlatRows = (summaryRows) => {
    const flatRows = [];
    summaryRows.forEach((item) => {
        item.name = item.sourcePath;
        flatRows.push(item);
    });

    return flatRows;
};

const addSummaryToRow = (summary, row) => {
    allMetrics.map((it) => it.id).forEach((id) => {
        const metricsData = summary[id];
        // css will no functions
        if (!metricsData) {
            return;
        }
        Object.keys(metricsData).forEach((k) => {
            row[`${id}_${k}`] = metricsData[k];
        });

        // status background
        row[`${id}_pctClassMap`] = `mcr-${metricsData.status}`;

        // chart
        row[`${id}_chart`] = metricsData.pct;

    });
};

const getGridRows = () => {
    const key = ['grid', state.group].join('-');
    // console.log(key);

    const cacheRows = state.gridDataCache[key];
    if (cacheRows) {
        return cacheRows;
    }

    const { summary, files } = state.reportData;

    const fileRows = files.map((it) => {

        const row = {
            ... it
        };

        addSummaryToRow(it.summary, row);

        return row;
    });

    const summaryRow = {
        name: 'Summary',
        type: '',
        url: '',
        isSummary: true,
        classMap: 'mcr-row-summary',
        sortFixed: 'top'
    };
    addSummaryToRow(summary, summaryRow);

    let rows = [summaryRow];
    if (state.group) {
        rows = rows.concat(getGroupRows(fileRows));
    } else {
        rows = rows.concat(getFlatRows(fileRows));
    }

    state.gridDataCache[key] = rows;

    return rows;
};

const getMetricsColumns = () => {
    return state.metrics.map((it) => {
        const item = {
            ... it
        };

        item.headerClassMap = 'mcr-column-separator';

        const id = item.id;
        let subs = [{
            id: `${id}_chart`,
            name: '<div class="mcr-pct-chart-header" />',
            width: 110,
            formatter: 'chart',
            invisible: it.collapsed
        }, {
            id: `${id}_pct`,
            name: '%',
            align: 'right',
            width: it.collapsed ? it.collapsed_width : it.expanded_width,
            formatter: 'percent'
        }, {
            id: `${id}_covered`,
            name: 'Covered',
            align: 'right',
            width: item.metrics_width,
            headerClassMap: 'mcr-metrics-head',
            formatter: 'metrics',
            invisible: it.collapsed
        }, {
            id: `${id}_uncovered`,
            name: 'Uncovered',
            align: 'right',
            width: item.metrics_width,
            headerClassMap: 'mcr-metrics-head',
            formatter: 'metrics',
            invisible: it.collapsed
        }, {
            id: `${id}_total`,
            name: 'Total',
            align: 'right',
            width: item.metrics_width,
            headerClassMap: 'mcr-column-separator mcr-metrics-head',
            classMap: 'mcr-column-separator',
            formatter: 'metrics',
            invisible: it.collapsed
        }];

        if (id === 'lines') {
            subs = subs.concat([{
                id: `${id}_blank`,
                name: 'Blank',
                align: 'right',
                width: item.metrics_width,
                headerClassMap: 'mcr-metrics-head',
                formatter: 'metrics',
                invisible: it.collapsed
            }, {
                id: `${id}_comment`,
                name: 'Comment',
                align: 'right',
                width: item.metrics_width,
                headerClassMap: 'mcr-column-separator mcr-metrics-head',
                classMap: 'mcr-column-separator',
                formatter: 'metrics',
                invisible: it.collapsed
            }]);
        }

        item.subs = subs;
        return item;
    });

};

const getGridData = () => {

    const metricsColumns = getMetricsColumns();

    const columns = [{
        id: 'name',
        name: 'Name',
        width: 350,
        maxWidth: 1230,
        classMap: 'mcr-column-name'
    }, {
        id: 'type',
        name: 'Type',
        align: 'center',
        width: 60,
        classMap: 'mcr-column-separator',
        headerClassMap: 'mcr-column-separator',
        formatter: 'type'
    }, ... metricsColumns, {
        id: 'url',
        name: 'URL',
        width: 350,
        maxWidth: 2000,
        formatter: 'url'
    }];

    const rows = getGridRows();

    return {
        columns,
        rows
    };

};

const watermarkFilter = (status) => {

    const map = {
        low: state.watermarkLow,
        medium: state.watermarkMedium,
        high: state.watermarkHigh
    };

    // always true if all checked
    if (map.low && map.medium && map.high) {
        return true;
    }

    // shows unknown if all unchecked
    map.unknown = !map.low && !map.medium && !map.high;

    if (map[status]) {
        return true;
    }

    return false;
};

const searchHandler = (rowItem) => {

    if (rowItem.tg_frozen) {
        return true;
    }

    const status = rowItem[`${state.watermarkType}_status`];
    const watermarkGate = watermarkFilter(status);
    if (!watermarkGate) {
        return false;
    }

    const keywords = state.keywords.trim().toLowerCase();
    if (!keywords) {
        return true;
    }
    const keywordList = keywords.split(/\s+/g);
    const value = rowItem.name;
    for (const item of keywordList) {
        if (value.indexOf(item) !== -1) {
            return true;
        }
        if (value.toLowerCase().indexOf(item.toLowerCase()) !== -1) {
            return true;
        }
    }
};

const initData = () => {
    const { files } = state.reportData;

    const fileMap = {};
    files.forEach((item) => {
        if (fileMap[item.id]) {
            console.error(`duplicate id: ${item.id} '${fileMap[item.id].url}' => '${item.url}'`);
        }
        fileMap[item.id] = item;
    });
    state.fileMap = fileMap;

};

const initGrid = () => {
    const grid = new Grid('.mcr-coverage-grid');
    state.grid = grid;
    bindGridEvents(grid);

    let rowNumber = 1;
    const options = {
        bindWindowResize: true,
        scrollbarRound: true,
        textSelectable: false,
        collapseAllVisible: true,
        rowHeight: 36,
        selectMultiple: false,
        // sortField: 'uncovered',
        // sortAsc: false,
        // sortOnInit: true,
        frozenRow: 0,
        frozenColumn: 0,
        frozenRowHoverable: true,
        rowFilter: searchHandler,
        rowNumberVisible: true,
        rowNumberFilter: (rowItem) => {
            if (!rowItem.isSummary && !rowItem.subs) {
                return rowNumber++;
            }
        },
        rowNotFound: 'No Results'
    };

    // no frozen in mini size
    if (state.windowWidth < 800) {
        options.frozenColumn = -1;
    }


    grid.setFormatter({
        header: function(value, rowItem, columnItem, cellNode) {
            const { id } = columnItem;
            const isMetrics = allMetrics.find((it) => it.id === id);
            if (isMetrics) {
                const cls = columnItem.collapsed ? 'collapsed' : 'expanded';
                return `<div class="mcr-metrics-name mcr-metrics-${cls}">${value}</div>`;
            }

            if (id === 'url') {
                return `<div class="vui vui-flex vui-flex-row"><div class="vui-flex-auto">${value}</div><div class="mcr-url-plus" tooltip="Increase width"></div></div>`;
            }

            return value;
        },

        type: (v, rowItem, columnItem) => {

            if (rowItem.debug) {
                return `<span class="mcr-debug" tooltip="debug file">${v}</span>`;
            }

            if (rowItem.empty) {
                return `<span class="mcr-empty" tooltip="empty coverage">${v}</span>`;
            }

            const distFile = rowItem.distFile;
            if (distFile) {
                return `<span class="mcr-source" tooltip="source from ${distFile}">${v}</span>`;
            }

            return v;
        },

        metrics: (v, rowItem, columnItem) => {
            if (typeof v === 'number') {

                const id = columnItem.id;
                let str = Util.NF(v);

                if (v > 0) {
                    if (id.endsWith('_covered')) {
                        str = `<span class="mcr-covered">${str}</span>`;
                    } else if (id.endsWith('_uncovered')) {
                        str = `<span class="mcr-uncovered">${str}</span>`;
                    }
                }

                // add tooltip for bytes
                if (id.startsWith('bytes_')) {
                    return `<span tooltip="${columnItem.name} ${Util.BSF(v)}">${str}</span>`;
                }

                return str;
            }
            return v;
        },
        chart: (v) => {
            if (typeof v === 'number') {
                return Util.generatePercentChart(v);
            }
            return '';
        },
        percent: (v) => {
            if (typeof v === 'number') {
                return Util.PF(v, 100, 2);
            }
            return v;
        },
        url: (v) => {
            if (v) {
                return `<a href="${v}" target="_blank">${v}</a>`;
            }
            return v;
        }
    });
    grid.setOption(options);
    grid.setData(getGridData());
    grid.render();
};

const renderGrid = () => {
    if (state.grid) {
        state.grid.setData(getGridData());
        state.grid.render();
    }
};

const updateGrid = () => {
    if (state.grid) {
        state.grid.update();
    }
};

const scrollToColumn = (v) => {
    if (state.grid) {
        state.grid.scrollToColumn(`${v}_chart`);
    }
};

// =================================================================================

const initStore = () => {
    const mapping = {
        'true': true,
        'false': false
    };
    ['group', 'formatted', 'count', 'locate'].forEach((item) => {
        // default empty string
        const v = store.get(item);
        // console.log(item, v);
        if (!v) {
            return;
        }
        if (Util.hasOwn(mapping, v)) {
            state[item] = mapping[v];
            return;
        }
        // console.log(item, v);
        state[item] = v;
    });

    allMetrics.forEach((m) => {
        const id = m.id;
        const v = store.get(`collapsed_${id}`);
        if (!v) {
            return;
        }

        if (Util.hasOwn(mapping, v)) {
            m.collapsed = mapping[v];
        }

    });
};

const setFavicon = () => {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
        favicon.href = faviconIcon;
    }
};

const init = async () => {
    initStore();

    const reportStr = await inflate(window.reportData);
    const reportData = JSON.parse(reportStr);
    console.log(reportData);

    // for export all data JSON able
    state.reportData = reportData;
    state.title = reportData.name || reportData.title || 'Coverage Report';
    Object.assign(state.watermarks, reportData.watermarks);
    state.version = reportData.version;

    // update metrics
    const metrics = reportData.metrics;
    if (Util.isList(metrics)) {
        const newMetrics = allMetrics.filter((item) => metrics.includes(item.id));
        if (newMetrics.length) {
            state.metrics = newMetrics;
        }
    } else {
        state.metrics = allMetrics;
    }

    // update watermarks
    state.watermarkOptions = state.metrics.map((it) => {
        return {
            label: it.name,
            value: it.id
        };
    });

    state.watermarkType = state.watermarkOptions[0].value;


    initTooltip();

    initFlyoverSize();

    initData();

    initGrid();

    setFavicon();

    state.initializing = false;
};


onMounted(() => {
    init();
});

watch(() => state.group, (v) => {
    store.set('group', v);
    renderGrid();
});

watch(() => state.formatted, (v) => {
    store.set('formatted', v);
});

watch(() => state.count, (v) => {
    store.set('count', v);
});

watch(() => state.locate, (v) => {
    store.set('locate', v);
});

const updateGridAsync = debounce(updateGrid, 200);
watch([
    () => state.keywords,
    () => state.watermarkLow,
    () => state.watermarkMedium,
    () => state.watermarkHigh,
    () => state.watermarkType
], () => {
    updateGridAsync();
});

const scrollToColumnAsync = debounce(scrollToColumn, 200);
watch(() => state.watermarkType, (v) => {
    scrollToColumnAsync(v);
});

window.addEventListener('popstate', microtask(() => {
    displayFlyoverWithHash();
}));

window.addEventListener('resize', () => {
    state.windowWidth = window.innerWidth;
    if (state.windowWidth < 600) {
        state.flyoverWidth = '100%';
    }
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        state.flyoverVisible = false;
    }
});

window.addEventListener('message', (e) => {
    const data = e.data;
    if (data && typeof data === 'object') {
        Object.assign(state, data);
    }
});

</script>

<template>
  <div class="mcr vui-flex-column">
    <VuiFlex
      class="mcr-header"
      padding="10px"
      gap="10px"
      shrink
    >
      <VuiFlex
        gap="10px"
        wrap
      >
        <div class="mcr-title">
          <a href="./">{{ state.title }}</a>
        </div>
      </VuiFlex>

      <div class="vui-flex-auto" />
    </VuiFlex>

    <VuiFlex
      class="mcr-filter"
      padding="10px"
      gap="10px"
      wrap
    >
      <div class="mcr-search-holder vui-flex-auto">
        <VuiFlex
          gap="10px"
          shrink
        >
          <div class="mcr-search">
            <VuiInput
              v-model="state.keywords"
              width="100%"
              :class="state.keywords?'mcr-search-keywords':''"
            />
            <IconLabel
              class="mcr-search-icon"
              icon="search"
              :button="false"
            />
            <IconLabel
              v-if="state.keywords"
              class="mcr-search-clear"
              icon="close"
              @click="state.keywords = ''"
            />
          </div>
          <VuiSwitch
            v-model="state.group"
            :label-clickable="true"
            label-position="right"
          >
            Group
          </VuiSwitch>
        </VuiFlex>
      </div>

      <VuiFlex class="mcr-watermarks">
        <VuiFlex
          class="mcr-low"
          gap="5px"
        >
          <VuiSwitch
            v-model="state.watermarkLow"
            :label-clickable="true"
            width="22px"
            height="15px"
          >
            low
          </VuiSwitch>
        </VuiFlex>

        <VuiFlex
          class="mcr-medium"
          gap="5px"
        >
          <div class="mcr-watermarks-value">
            {{ state.watermarks.bytes[0] }}
          </div>
          <VuiSwitch
            v-model="state.watermarkMedium"
            :label-clickable="true"
            width="22px"
            height="15px"
          >
            medium
          </VuiSwitch>
        </VuiFlex>

        <VuiFlex
          class="mcr-high"
          gap="5px"
        >
          <div class="mcr-watermarks-value">
            {{ state.watermarks.bytes[1] }}
          </div>
          <VuiSwitch
            v-model="state.watermarkHigh"
            :label-clickable="true"
            width="22px"
            height="15px"
          >
            high
          </VuiSwitch>
        </VuiFlex>
      </VuiFlex>

      <VuiSelect
        v-model="state.watermarkType"
        :options="state.watermarkOptions"
      />
    </VuiFlex>

    <div class="mcr-coverage-grid vui-flex-auto" />

    <Flyover>
      <Report @jump="showFlyover" />
    </Flyover>

    <VuiTooltip
      :class="tooltip.classMap"
      :visible="tooltip.visible"
      :target="tooltip.target"
      :text="tooltip.text"
      :html="tooltip.html"
    />

    <VuiLoading
      :visible="state.initializing"
      size="l"
      center
    />
  </div>
</template>

<style lang="scss">
html {
    height: 100%;
}

body {
    --font-monospace: sfmono-regular, menlo, monaco, consolas, "Liberation Mono", "Courier New", monospace;

    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    color: #333;
    font-size: 14px;
    font-family: arial, sans-serif;
    overflow: hidden;
}

svg {
    display: block;
}

a {
    color: #0d6efd;
    text-decoration: underline;
}

a:hover {
    color: #0a58ca;
}

a:not([href], [class]),
a:not([href], [class]):hover {
    color: inherit;
    text-decoration: none;
}

.mcr {
    width: 100%;
    height: 100%;
    overflow: hidden;

    .mcr-searchable b {
        color: red;
    }
}

/*
icon
*/

.mcr-icon {
    display: block;
    width: 20px;
    height: 20px;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: 20px 20px;
    cursor: pointer;
    opacity: 0.8;
    overflow: hidden;
}

.mcr-icon:hover {
    opacity: 1;
}

.mcr-header {
    color: #fff;
    background-color: #24292f;

    .mcr-title {
        font-size: 18px;
        line-height: 22px;
        white-space: nowrap;
        text-overflow: ellipsis;

        a {
            color: #fff;
            text-decoration: none;
        }
    }
}

.mcr-filter {
    border-bottom: 1px solid #ddd;
}

.mcr-search-holder {
    min-width: 150px;
}

.mcr-search {
    position: relative;
    width: 100%;
    max-width: 350px;
    padding: 5px;

    input {
        height: 30px;
        padding-right: 30px;
        padding-left: 30px;
        border-radius: 10px;
    }
}

.mcr-search-icon {
    position: absolute;
    top: 50%;
    left: 13px;
    color: gray;
    transform: translate(0, -50%);
}

.mcr-search-clear {
    position: absolute;
    top: 50%;
    right: 13px;
    transform: translate(0, -50%);
}

.mcr-search-keywords {
    input {
        border-color: #80bdff;
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgb(0 123 255 / 25%);
    }
}

.mcr-column-name {
    text-decoration: underline;
    cursor: pointer;
}

.mcr-metrics-head {
    font-size: 12px;
}

.mcr-low {
    background: #fce1e5;
}

.mcr-medium {
    background: #fff4c2;
}

.mcr-high {
    background: #e6f5d0;
}

.mcr-watermarks {
    position: relative;
    border: 1px solid #ccc;
    border-radius: 10px;

    .mcr-low,
    .mcr-medium,
    .mcr-high {
        padding: 5px 20px;
        overflow: visible;
    }

    .mcr-low {
        padding-left: 10px;
    }

    .mcr-high {
        padding-right: 10px;
    }

    .mcr-watermarks-value {
        position: absolute;
        left: 0;
        z-index: 10;
        padding: 2px 5px;
        font-size: 11px;
        font-family: Arial, sans-serif;
        border-radius: 5px;
        background-color: #fff;
        cursor: default;
        transform: translateX(-50%);
    }
}

.mcr-percent-chart {
    position: relative;
    display: inline-block;
    width: 100%;
    height: 10px;
    box-sizing: border-box;
    border-radius: 3px;
    background-color: #ee442f;
    overflow: hidden;
}

.mcr-percent-chart::after {
    position: absolute;
    top: 0;
    left: 0;
    content: "";
    width: var(--mcr-percent);
    height: 100%;
    background-color: #4d9221;
}

.mcr-metrics-name {
    padding-left: 20px;
    vertical-align: middle;
    background-repeat: no-repeat;
    background-position: 5px center;
    background-size: 10px 10px;
    cursor: pointer;
}

.mcr-metrics-expanded {
    background-image: url("./images/expanded.svg");
}

.mcr-metrics-collapsed {
    background-image: url("./images/collapsed.svg");
}

.mcr-pct-chart-header {
    height: 16px;
    background-image: url("./images/chart.svg");
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 16px 16px;
}

.mcr-note {
    margin: 5px 0;
    line-height: 120%;
}

.mcr-debug {
    padding-left: 18px;
    background-image: url("./images/icons/debug.svg");
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 16px 16px;
}

.mcr-empty {
    padding-left: 13px;
    background-image: url("./images/empty.svg");
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 11px 11px;
}

.mcr-source {
    padding-left: 15px;
    background-image: url("./images/source.svg");
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 16px 16px;
}

.mcr-url-plus {
    width: 16px;
    height: 16px;
    margin-right: 5px;
    padding-left: 16px;
    background-image: url("./images/plus.svg");
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 16px 16px;
}

.mcr-covered {
    color: green;
}

.mcr-uncovered {
    color: red;
}

.tg-turbogrid {
    .tg-group {
        .mcr-column-name {
            text-decoration: none;
            cursor: default;
        }
    }

    .tg-pane.tg-frozen-line-v {
        border-right: thin solid #eee;
    }

    .mcr-column-separator {
        border-right: thin solid #ccc;
    }

    .mcr-row-summary {
        font-weight: bold;
        background-color: #eef6ff;

        .mcr-column-name {
            text-decoration: none;
            cursor: default;
        }
    }
}
</style>
