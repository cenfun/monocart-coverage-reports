const Util = require('../utils/util.js');
module.exports = class InfoFunction {
    constructor(start, end, count, name) {
        this.start = start;
        this.end = end;
        this.count = count;
        this.name = name;
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

    generate(locator, index) {

        const loc = {
            start: this.start,
            end: this.end
        };

        Util.updateOffsetToLocation(locator, loc);

        const line = loc.start.line;

        const name = this.name || `(anonymous_${index})`;

        return {
            name,
            decl: loc,
            loc: loc,
            line: line
        };
    }
};
