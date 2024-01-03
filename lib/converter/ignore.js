const Util = require('../utils/util.js');

const getNextN = (content, currentLine, item, locator) => {

    // v8 ignore next N
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

    // v8 ignore next
    return 1;
};

const addNextIgnore = (list, content, item, locator) => {

    const { lineParser } = locator;

    // findLine 0-base
    const currentLine = lineParser.findLine(item.end);
    const n = getNextN(content, currentLine, item, locator);

    // console.log('current line', currentLine.line, 'lines', lines);

    // getLine 1-base
    const line = currentLine.line + 1;
    const endLine = locator.getLine(line + n);
    const endOffset = endLine ? endLine.end : locator.source.length;

    const nextItem = {
        type: 'next',
        n,
        startOffset: item.end,
        endOffset
    };

    list.push(nextItem);
};

const getIgnoredRanges = (locator) => {

    const { lineParser } = locator;

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
        let content = block ? text.slice(2, -2) : text.slice(2);
        content = content.trim();

        const v8IgnoreKey = 'v8 ignore';
        if (!content.startsWith(v8IgnoreKey)) {
            return;
        }

        content = content.slice(v8IgnoreKey.length).trim();

        if (ignoreStart) {
            // v8 ignore stop
            if (content === 'stop') {
                ignoreStart.endOffset = start;
                ignoreStart = null;
            }
            return;
        }

        // v8 ignore start
        if (content === 'start') {
            // add first for sort by start
            ignoreStart = {
                type: 'start',
                startOffset: end,
                endOffset: end
            };
            list.push(ignoreStart);
            return;
        }

        // v8 ignore next N
        const nextKey = 'next';
        if (content.startsWith(nextKey)) {
            content = content.slice(nextKey.length).trim();
            addNextIgnore(list, content, item, locator);
        }

    });

    // ignore not stop
    if (ignoreStart) {
        ignoreStart.endOffset = locator.source.length;
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
