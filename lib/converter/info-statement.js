const Util = require('../utils/util.js');
module.exports = class InfoStatement {
    constructor(data, original) {
        const {
            start, end, count
        } = data;

        this.start = start;
        this.end = end;
        this.count = count;
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
        if (Util.isDebug() && this.original) {
            range.generatedStart = this.data.generatedStart;
            range.generatedEnd = this.data.generatedEnd;
        }
        return range;
    }

    generate(locator) {

        const loc = {
            start: this.start,
            end: this.end
        };

        Util.updateOffsetToLocation(locator, loc);

        return loc;
    }
};
