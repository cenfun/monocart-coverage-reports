const Util = require('../utils/util.js');
module.exports = class InfoFunction {
    constructor(data, original) {

        const {
            start, end, functionName, count
        } = data;

        this.start = start;
        this.end = end;
        this.count = count;
        this.functionName = functionName;
        this.data = data;
        this.original = original;
    }

    getRange() {
        const range = {
            start: this.start,
            end: this.end,
            count: this.count
        };
        if (this.ignored) {
            range.ignored = true;
        }
        // for debug
        if (Util.loggingType === 'debug' && this.original) {
            range.generatedStart = this.data.generatedStart;
            range.generatedEnd = this.data.generatedEnd;
        }
        return range;
    }

    generate(locator, index) {

        const loc = {
            start: this.start,
            end: this.end
        };

        Util.updateOffsetToLocation(locator, loc);

        const line = loc.start.line;

        const functionName = this.functionName || `(anonymous_${index})`;

        return {
            name: functionName,
            decl: loc,
            loc: loc,
            line: line
        };
    }
};
