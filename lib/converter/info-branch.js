const Util = require('../utils/util.js');
module.exports = class InfoBranch {
    constructor(data, original) {
        const {
            start, end, locations, type
        } = data;

        this.start = start;
        this.end = end;
        this.locations = locations;
        this.type = type;
        this.data = data;
        this.original = original;
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
            // for debug
            if (Util.isDebug() && this.original) {
                range.generatedStart = item.generatedStart;
                range.generatedEnd = item.generatedEnd;
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
        // do NOT change previous number type to object, need used for sourcemap
        const newLocations = this.locations.filter((it) => !it.ignored).map((it) => {
            const item = {
                start: it.start,
                end: it.end,
                none: it.none,
                count: it.count
            };

            // [ { start:{line,column}, end:{line,column}, count }, ...]
            Util.updateOffsetToLocation(locator, item);

            return item;
        });

        const map = {
            loc: groupLoc,
            type: this.type,
            locations: newLocations.map((item) => {
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

        const counts = newLocations.map((item) => item.count);

        return {
            map,
            counts
        };
    }

};
