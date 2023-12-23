module.exports = class InfoBranch {
    constructor(type, line, loc, locations) {
        this.type = type;
        this.line = line;
        this.loc = loc;

        // [ { start:{line,column}, end:{line,column}, count }, ...]
        this.locations = locations;
    }

    generate() {
        return {
            loc: this.loc,
            type: this.type,
            locations: this.locations.map((item) => {
                return {
                    start: item.start,
                    end: item.end
                };
            }),
            line: this.line
        };
    }

    generateCounts() {
        return this.locations.map((item) => item.count);
    }
};
