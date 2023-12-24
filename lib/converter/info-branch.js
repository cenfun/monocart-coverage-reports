module.exports = class InfoBranch {
    constructor(loc, locations, type) {
        this.loc = loc;
        this.line = loc.start.line;
        // [ { start:{line,column}, end:{line,column}, count }, ...]
        this.locations = locations;
        this.type = type || 'branch';
    }

    generate() {
        return {
            loc: this.loc,
            type: this.type,
            locations: this.locations.map((item) => {
                const { start, end } = item;
                return {
                    start: start || {},
                    end: end || {}
                };

            }),
            line: this.line
        };
    }

    generateCounts() {
        return this.locations.map((item) => item.count);
    }
};
