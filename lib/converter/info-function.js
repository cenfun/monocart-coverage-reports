module.exports = class InfoFunction {
    constructor(loc, count, name) {
        this.loc = loc;
        this.line = loc.start.line;
        this.count = count;
        this.name = name || '(anonymous)';
    }

    generate() {
        return {
            name: this.name,
            decl: this.loc,
            loc: this.loc,
            line: this.line
        };
    }
};
