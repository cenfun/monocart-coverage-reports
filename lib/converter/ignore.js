const Util = require('../utils/util.js');

const getNextN = (content, currentLine, item, locator) => {

    // v-8 ignore next N
    if (content) {
        const n = parseInt(content);
        if (n && n > 0) {
            return n;
        }
        return 1;
    }

    // block comment not end of line, same line
    if (item.block) {
        // has code between comment and line end
        const text = locator.getSlice(item.end, currentLine.end).trim();
        if (text) {
            return 0;
        }
    }

    // v-8 ignore next
    return 1;
};

const extendStart = (start, source) => {
    // extend left, include
    while (start > 0 && Util.isBlank(source[start - 1])) {
        start -= 1;
    }
    return start;
};

const extendEnd = (end, source, maxLength) => {
    // extend right, exclude
    while (end < maxLength && Util.isBlank(source[end])) {
        end += 1;
    }
    return end;
};

const addNextIgnore = (list, content, item, locator) => {

    const { lineParser, source } = locator;
    const maxLength = source.length;

    const start = extendStart(item.start, source);

    // findLine 0-base
    const currentLine = lineParser.findLine(item.end);
    const n = getNextN(content, currentLine, item, locator);

    // console.log('current line', currentLine.line, 'lines', lines);

    // getLine 1-base
    const line = currentLine.line + 1;
    const endLine = locator.getLine(line + n);
    const end = extendEnd(endLine ? endLine.end : maxLength, source, maxLength);

    const nextItem = {
        type: 'next',
        n,
        start,
        end
    };

    list.push(nextItem);
};

// both v8 or c8
const getStartEndNextInfo = (content) => {
    content = content.trim();

    const start = 'start';
    const stop = 'stop';
    const next = 'next';
    if (content.startsWith(start)) {
        return {
            type: 'range',
            value: stop
        };
    }
    if (content.startsWith(stop)) {
        return {
            type: 'range',
            value: stop
        };
    }
    if (content.startsWith(next)) {
        return {
            type: 'next',
            value: content.slice(next.length)
        };
    }
};

const getDisableEnableNextInfo = (content) => {
    content = content.trim();

    const start = 'disable';
    const stop = 'enable';
    const next = 'ignore next';
    if (content.startsWith(start)) {
        return {
            type: 'range',
            value: stop
        };
    }
    if (content.startsWith(stop)) {
        return {
            type: 'range',
            value: stop
        };
    }
    if (content.startsWith(next)) {
        return {
            type: 'next',
            value: content.slice(next.length)
        };
    }
};


const getIgnoreInfo = (content) => {
    content = content.trim();

    const v8_ignore = 'v8 ignore';
    if (content.startsWith(v8_ignore)) {
        return getStartEndNextInfo(content.slice(v8_ignore.length));
    }

    const c8_ignore = 'c8 ignore';
    if (content.startsWith(c8_ignore)) {
        return getStartEndNextInfo(content.slice(c8_ignore.length));
    }

    const node_coverage = 'node:coverage';
    if (content.startsWith(node_coverage)) {
        return getDisableEnableNextInfo(content.slice(node_coverage.length));
    }

};

const getIgnoredRanges = (locator, options) => {
    if (!options.v8Ignore) {
        return;
    }

    const { lineParser, source } = locator;
    const maxLength = source.length;

    const comments = lineParser.comments;
    if (!Util.isList(comments)) {
        return;
    }

    const list = [];
    let ignoreStart = null;

    comments.forEach((item) => {
        const {
            block, start, end, text
        } = item;

        const content = block ? text.slice(2, -2) : text.slice(2);
        const ignoreInfo = getIgnoreInfo(content);
        if (!ignoreInfo) {
            return;
        }

        const { type, value } = ignoreInfo;

        if (ignoreStart) {
            // v-8 ignore stop
            if (type === 'range' && value === ignoreStart.value) {
                ignoreStart.ignoreData.end = extendEnd(end, source, maxLength);
                ignoreStart = null;
            }
            return;
        }

        // v-8 ignore start
        if (type === 'range') {
            // add first for sort by start
            const ignoreData = {
                type,
                start: extendStart(start, source),
                end: start
            };
            list.push(ignoreData);
            ignoreStart = {
                ignoreData,
                value
            };
            return;
        }

        // next N
        if (type === 'next') {
            addNextIgnore(list, value.trim(), item, locator);
        }

    });

    // ignore not stop
    if (ignoreStart) {
        ignoreStart.end = locator.source.length;
        ignoreStart = null;
    }

    if (!list.length) {
        return;
    }

    // console.log('=============================================');
    // console.log(list);

    return list;
};


module.exports = {
    getIgnoredRanges
};
