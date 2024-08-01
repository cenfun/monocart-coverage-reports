const Util = {

    hasOwn: function(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    },

    isNull: function(input) {
        if (input === null || typeof input === 'undefined') {
            return true;
        }
        return false;
    },

    uid: function(len = 20, prefix = '') {
        const dict = '0123456789abcdefghijklmnopqrstuvwxyz';
        const dictLen = dict.length;
        let str = prefix;
        while (len--) {
            str += dict[Math.random() * dictLen | 0];
        }
        return str;
    },

    zero: function(s, l = 2) {
        s = `${s}`;
        return s.padStart(l, '0');
    },

    isNum: function(num) {
        if (typeof num !== 'number' || isNaN(num)) {
            return false;
        }
        const isInvalid = function(n) {
            if (n === Number.MAX_VALUE || n === Number.MIN_VALUE || n === Number.NEGATIVE_INFINITY || n === Number.POSITIVE_INFINITY) {
                return true;
            }
            return false;
        };
        if (isInvalid(num)) {
            return false;
        }
        return true;
    },

    toNum: function(num, toInt) {
        if (typeof (num) !== 'number') {
            num = parseFloat(num);
        }
        if (isNaN(num)) {
            num = 0;
        }
        if (toInt) {
            num = Math.round(num);
        }
        return num;
    },

    isList: function(data) {
        if (data && data instanceof Array && data.length > 0) {
            return true;
        }
        return false;
    },

    toList: function(data, separator) {
        if (data instanceof Array) {
            return data;
        }
        if (typeof data === 'string' && (typeof separator === 'string' || separator instanceof RegExp)) {
            return data.split(separator).map((str) => str.trim()).filter((str) => str);
        }
        if (typeof data === 'undefined' || data === null) {
            return [];
        }
        return [data];
    },

    forEach: function(rootList, callback) {
        const isBreak = (res) => {
            return res === 'break' || res === false;
        };
        const forList = (list, parent) => {
            if (!Util.isList(list)) {
                return;
            }
            for (const item of list) {
                const result = callback(item, parent);
                if (isBreak(result)) {
                    return result;
                }
                const subResult = forList(item.subs, item);
                if (isBreak(subResult)) {
                    return subResult;
                }
            }
        };
        forList(rootList);
    },

    // \ to /
    formatPath: function(str) {
        if (str) {
            str = str.replace(/\\/g, '/');
        }
        return str;
    },

    getCurrentTrendInfo: (data) => {

        const {
            date, duration, summary
        } = data;

        const info = {
            date,
            duration
        };

        Object.keys(summary).forEach((k) => {
            const item = summary[k];
            info[k] = item.value;
        });

        return info;
    },

    isTagItem: (item) => {
        if (item.type === 'case' || (item.type === 'suite' && item.suiteType === 'describe')) {
            return true;
        }
        return false;
    },

    delay: function(ms) {
        return new Promise((resolve) => {
            if (ms) {
                setTimeout(resolve, ms);
            } else {
                setImmediate(resolve);
            }
        });
    },

    // =============================================================================

    getMetrics: (metrics, type) => {
        const istanbulMetrics = ['statements', 'branches', 'functions', 'lines'];
        const v8Metrics = ['bytes'].concat(istanbulMetrics);
        const allMetrics = type === 'istanbul' ? istanbulMetrics : v8Metrics;
        let list = allMetrics;
        if (Util.isList(metrics)) {
            const newList = list.filter((k) => metrics.includes(k));
            if (newList.length) {
                list = newList;
            }
        }
        return list;
    },

    generatePercentChart: function(percent) {
        return `<div style="--mcr-percent:${percent}%;" class="mcr-percent-chart"></div>`;
    },

    getStatus: (value, watermarks) => {
        if (!watermarks) {
            return 'unknown';
        }
        if (value < watermarks[0]) {
            return 'low';
        }
        if (value < watermarks[1]) {
            return 'medium';
        }
        return 'high';
    },

    isJsonType: (contentType) => {
        if (contentType) {
            if (contentType === 'application/json' || contentType === 'json') {
                return true;
            }
        }
        return false;
    },

    isMarkdownType: (contentType) => {
        if (contentType) {
            if (contentType === 'text/markdown' || contentType === 'markdown') {
                return true;
            }
        }
        return false;
    },

    isTextType: (contentType) => {
        if (contentType) {
            if (contentType.startsWith('text')) {
                return true;
            }
            if (Util.isMarkdownType(contentType)) {
                return true;
            }
            if (Util.isJsonType(contentType)) {
                return true;
            }
        }
        return false;
    },

    isBlank: (codeStr) => {
        if (typeof codeStr === 'string') {
            const blankBlock = /\S/;
            return !blankBlock.test(codeStr);
        }
        return false;
    },

    findInRanges: (startPos, endPos, rangeList, startKey = 'start', endKey = 'end') => {
        if (!Util.isList(rangeList)) {
            return;
        }

        // rangeList should be sorted by startKey, but seems useless here
        const list = rangeList.filter((it) => startPos >= it[startKey] && endPos <= it[endKey]);
        if (!list.length) {
            return;
        }

        // could be multiple results, but seems no case for now
        // if (list.length > 1) {
        //     console.log('==============', list);
        // }

        return list[0];
    },

    getRangeLines: (sLoc, eLoc) => {

        const lines = [];

        // invalid location order
        if (sLoc.line > eLoc.line) {
            return lines;
        }

        // nothing middle
        if (sLoc.line === eLoc.line && sLoc.column >= eLoc.column) {
            return lines;
        }

        const addStart = () => {

            // nothing start
            if (sLoc.column >= sLoc.length) {
                return;
            }

            const entire = sLoc.column <= sLoc.indent;
            lines.push({
                line: sLoc.line,
                entire,
                pieces: {
                    start: sLoc.column,
                    end: sLoc.length
                }
            });
        };

        const addMiddle = () => {

            const start = sLoc.column <= sLoc.indent;
            const end = Util.isBlank(eLoc.text.slice(eLoc.column));
            const entire = start && end;
            // same line
            lines.push({
                line: sLoc.line,
                entire,
                pieces: {
                    start: sLoc.column,
                    end: eLoc.column
                }
            });
        };

        const addEnd = () => {

            // nothing end
            if (eLoc.column === 0) {
                return;
            }

            // pieces in indent, ignored
            if (eLoc.column <= eLoc.indent) {
                return;
            }

            const rightText = eLoc.text.slice(eLoc.column);

            // right text is blank or only ";" (few cases)
            const entire = Util.isBlank(rightText) || rightText.trim() === ';';
            lines.push({
                line: eLoc.line,
                entire,
                pieces: {
                    start: eLoc.indent,
                    end: eLoc.column
                }
            });
        };

        // same line, single line
        if (sLoc.line === eLoc.line) {

            addMiddle();

        } else {
            // multiple lines

            addStart();

            // always entire for middle lines
            const lineStart = sLoc.line + 1;
            const lineEnd = eLoc.line;
            if (lineEnd > lineStart) {
                for (let i = lineStart; i < lineEnd; i++) {
                    lines.push({
                        line: i,
                        entire: true
                        // no pieces for entire line
                    });
                }
            }

            // check end
            addEnd();
        }

        return lines;
    },

    initLineCoverage: (lineItem) => {
        lineItem.coveredCount = 1;
        lineItem.uncoveredEntire = null;
        lineItem.uncoveredPieces = [];
    },

    updateLinesCoverage: (lines, count, lineMap) => {
        lines.forEach((it) => {
            const lineItem = lineMap.get(it.line);
            if (!lineItem) {
                // not found line, could be comment or blank line
                return;
            }

            if (lineItem.ignored) {
                return;
            }

            it.count = count;

            // default is covered, so only focus on
            // 1, biggest covered count
            // 2, uncovered entire and pieces
            if (count > 0) {
                lineItem.coveredCount = Math.max(lineItem.coveredCount, count);
                return;
            }

            if (it.entire) {
                lineItem.uncoveredEntire = it;
            } else {
                lineItem.uncoveredPieces.push(it);
            }

        });

    },

    // =============================================================================
    // svg

    dFixed: (num, fixed = 1) => {
        if (Number.isInteger(num)) {
            return num;
        }
        return Util.toNum(Util.toNum(num).toFixed(fixed));
    },

    pxFixed: (num) => {
        const floor = Math.floor(num);
        if (num < floor + 0.5) {
            return floor + 0.5;
        }
        return floor + 1.5;
    },

    point: (px, py) => {
        return `${Util.dFixed(px)},${Util.dFixed(py)}`;
    },

    capitalizeFirstLetter: (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    // =============================================================================
    // formatter

    // number
    NF: function(v) {
        if (typeof v === 'number' && v) {
            return v.toLocaleString();
        }
        return v;
    },

    // percent
    PF: function(v, t = 1, digits = 1, unit = '%', space = '') {
        v = Util.toNum(v);
        t = Util.toNum(t);
        let per = 0;
        if (t) {
            per = v / t;
        }
        const perStr = (per * 100).toFixed(digits);
        if (unit) {
            return perStr + space + unit;
        }
        return parseFloat(perStr);
    },

    PSF: function(v, t = 1, digits = 1) {
        return Util.PF(v, t, digits, '%', ' ');
    },

    PNF: function(v, t = 1, digits = 1) {
        return Util.PF(v, t, digits, '');
    },

    // byte
    BF: function(v, places = 1, space = '') {
        v = Util.toNum(v, true);
        if (v === 0) {
            return `0${space}B`;
        }
        let prefix = '';
        if (v < 0) {
            v = Math.abs(v);
            prefix = '-';
        }

        const base = 1024;
        const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        for (let i = 0, l = units.length; i < l; i++) {
            const min = Math.pow(base, i);
            const max = Math.pow(base, i + 1);
            if (v > min && v < max) {
                const unit = units[i];
                v = prefix + parseFloat((v / min).toFixed(places)) + space + unit;
                break;
            }
        }
        return v;
    },

    BSF: function(v, places = 1) {
        return Util.BF(v, places, ' ');
    },

    // time
    TF: function(v, space = '') {
        const ms = Util.toNum(v, true);

        if (ms < 1000) {
            return `${ms}${space}ms`;
        }

        if (ms < 60 * 1000) {
            const ss = parseFloat((ms / 1000).toFixed(1));
            return `${ss}${space}s`;
        }

        const s = Math.round(ms / 1000);

        const m = 60;
        const h = m * 60;
        const d = h * 24;

        if (s < h) {
            const minutes = Math.floor(s / m);
            const seconds = s - minutes * m;
            return `${minutes}${space}m ${seconds}${space}s`;
        }

        if (s < d) {
            const hours = Math.floor(s / h);
            const minutes = Math.floor((s - hours * h) / m);
            const seconds = s - hours * h - minutes * m;
            return `${hours}${space}h ${minutes}${space}m ${seconds}${space}s`;
        }

        const days = Math.floor(s / d);
        const hours = Math.floor((s - days * d) / h);
        const minutes = Math.floor((s - days * d - hours * h) / m);
        const seconds = s - days * d - hours * h - minutes * m;
        return `${days}${space}d ${hours}${space}h ${minutes}${space}m ${seconds}${space}s`;
    },

    TSF: function(v) {
        return Util.TF(v, ' ');
    }
};


module.exports = Util;
