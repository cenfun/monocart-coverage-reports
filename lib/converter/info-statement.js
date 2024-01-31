const Util = require('../utils/util.js');
module.exports = class InfoStatement {
    constructor(start, end, count) {
        this.start = start;
        this.end = end;
        this.count = count;
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
