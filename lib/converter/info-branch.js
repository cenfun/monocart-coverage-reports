const Util = require('../utils/util.js');
module.exports = class InfoBranch {
    constructor(start, end, locations, type) {
        this.start = start;
        this.end = end;
        this.locations = locations;
        this.type = type || 'branch';
    }

    getRanges() {
        return this.locations.map((item) => {
            const range = {
                start: item.start,
                end: item.end,
                count: item.count
            };
            if (item.none) {
                range.none = true;
            }
            if (item.ignored) {
                range.ignored = true;
            }
            return range;
        });
    }

    generate(locator) {
        const groupLoc = {
            start: this.start,
            end: this.end
        };
        Util.updateOffsetToLocation(locator, groupLoc);
        const line = groupLoc.start.line;

        // remove ignored
        const locations = this.locations.filter((it) => !it.ignored);

        // [ { start:{line,column}, end:{line,column}, count }, ...]
        locations.forEach((item) => {
            Util.updateOffsetToLocation(locator, item);
        });

        const map = {
            loc: groupLoc,
            type: this.type,
            locations: locations.map((item) => {
                const {
                    start, end, none
                } = item;
                if (none) {
                    // none with group start/end, should be empty for istanbul
                    return {
                        start: {},
                        end: {}
                    };
                }
                return {
                    start,
                    end
                };

            }),
            line: line
        };

        const counts = locations.map((item) => item.count);

        return {
            map,
            counts
        };
    }

};
