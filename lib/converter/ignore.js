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

    const { lineParser, source } = locator;
    const maxLength = source.length;
    let startOffset = item.start;
    // extend left
    while (startOffset > 0 && Util.isBlank(source[startOffset - 1])) {
        startOffset -= 1;
    }

    // findLine 0-base
    const currentLine = lineParser.findLine(item.end);
    const n = getNextN(content, currentLine, item, locator);

    // console.log('current line', currentLine.line, 'lines', lines);

    // getLine 1-base
    const line = currentLine.line + 1;
    const endLine = locator.getLine(line + n);
    let endOffset = endLine ? endLine.end : maxLength;
    // extend right
    while (endOffset < maxLength && Util.isBlank(source[endOffset + 1])) {
        endOffset += 1;
    }

    const nextItem = {
        type: 'next',
        n,
        startOffset,
        endOffset
    };

    list.push(nextItem);
};

// both v8 or c8
const hasIgnoreKey = (content) => {
    const v8Key = 'v8 ignore';
    if (content.startsWith(v8Key)) {
        return v8Key.length;
    }
    const c8Key = 'c8 ignore';
    if (content.startsWith(c8Key)) {
        return c8Key.length;
    }
};

const getIgnoredRanges = (locator, options) => {
    if (!options.v8Ignore) {
        return;
    }

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

        const ignoreKey = hasIgnoreKey(content);
        if (!ignoreKey) {
            return;
        }

        content = content.slice(ignoreKey).trim();

        if (ignoreStart) {
            // v8 ignore stop
            if (content === 'stop') {
                ignoreStart.endOffset = end;
                ignoreStart = null;
            }
            return;
        }

        // v8 ignore start
        if (content === 'start') {
            // add first for sort by start
            ignoreStart = {
                type: 'start-stop',
                startOffset: start,
                endOffset: start
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
