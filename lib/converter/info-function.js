const Util = require('../utils/util.js');
module.exports = class InfoFunction {
    constructor(data, original) {

        const {
            start, end, bodyStart, bodyEnd, functionName, count
        } = data;

        this.start = start;
        this.end = end;
        this.bodyStart = bodyStart;
        this.bodyEnd = bodyEnd;
        this.count = count;
        this.functionName = functionName;
        this.data = data;
        this.original = original;
    }

    getName(index) {
        return this.functionName || `(anonymous_${index})`;
    }

    getRange(index) {
        const range = {
            name: this.getName(index),
            start: this.start,
            end: this.end,
            count: this.count
        };
        if (this.ignored) {
            range.ignored = true;
        }
        // for debug
        if (Util.isDebug() && this.original) {
            range.generatedStart = this.data.generatedStart;
            range.generatedEnd = this.data.generatedEnd;
        }
        return range;
    }

    generate(locator, index) {

        const decl = {
            start: this.start,
            end: this.bodyStart
        };

        Util.updateOffsetToLocation(locator, decl);

        const loc = {
            start: this.bodyStart,
            end: this.end
        };

        Util.updateOffsetToLocation(locator, loc);

        const line = loc.start.line;

        return {
            name: this.getName(index),
            decl: decl,
            loc: loc,
            line: line
        };
    }
};
