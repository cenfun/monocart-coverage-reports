const { LineParser } = require('monocart-formatter/node');
class PositionMapping {
    constructor(source) {
        this.source = source;
        this.lineParser = new LineParser(source);
        this.lines = this.lineParser.lines;
    }

    getSlice(s, e) {
        return this.source.slice(s, e);
    }

    // 1-base
    locationToOffset(location) {
        const { line, column } = location;
        // 1-based
        const lineInfo = this.lines[line - 1];
        if (lineInfo) {
            if (column === Infinity) {
                return lineInfo.start + lineInfo.length;
            }
            return lineInfo.start + column;
        }
        return 0;
    }

    // 1-base
    offsetToLocation(offset) {
        const lineInfo = this.lineParser.findLine(offset);

        // 1-base
        const line = lineInfo.line + 1;

        const column = Math.min(Math.max(offset - lineInfo.start, 0), lineInfo.length);

        return {
            ... lineInfo,
            line,
            column
        };
    }

    // 1-base
    getLine(line) {
        return this.lines[line - 1];
    }


}

module.exports = PositionMapping;

