module.exports = class InfoLine {
    constructor(line, column, count = 1) {
        // 1 based
        this.line = line;
        this.column = column;
        this.count = count;
        // covered full line, could be false even count > 0
        this.covered = count > 0;
    }

    generate() {
        return {
            start: {
                line: this.line,
                column: 0
            },
            end: {
                line: this.line,
                column: this.column
            }
        };
    }
};
