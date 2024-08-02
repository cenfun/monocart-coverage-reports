const os = require('os');

const renderLine = (ls, padding) => {
    const spacing = ''.padEnd(padding, ' ');
    const line = ls.join(`${spacing}|${spacing}`);
    return `|${spacing}${line}${spacing}|`;
};

const renderCell = (cellValue, column) => {

    // To include a pipe | as content within your cell, use a \ before the pipe:
    cellValue = cellValue.split(/\\?\|/g).join('\\|');
    const valueWidth = cellValue.length;
    const width = column.width;

    if (width <= valueWidth) {
        return cellValue;
    }

    const spacingWidth = width - valueWidth;
    const spacing = ''.padEnd(spacingWidth, ' ');

    const align = column.align;

    if (align === 'right') {
        return spacing + cellValue;
    }

    if (align === 'center') {
        const l = Math.round(spacingWidth * 0.5);
        const r = spacingWidth - l;
        const spacingL = ''.padEnd(l, ' ');
        const spacingR = ''.padEnd(r, ' ');
        return spacingL + cellValue + spacingR;

    }

    return cellValue + spacing;
};

const renderHyphen = (column) => {
    const width = column.width;
    const align = column.align;
    if (align === 'right') {
        return ':'.padStart(width, '-');
    }
    if (align === 'center') {
        const hyphen = ''.padEnd(width - 2, '-');
        return `:${hyphen}:`;
    }
    // default to left
    return ':'.padEnd(width, '-');
};

const markdownGrid = (data) => {

    const options = {
        name: '',
        padding: 1,
        nullPlaceholder: '',
        ... data.options
    };

    const padding = options.padding;

    // console.log(data, options);

    const lines = [];

    if (options.name) {
        lines.push(`## ${options.name}`);
    }

    // init columns
    const columns = data.columns.map((item) => {
        if (typeof item === 'string') {
            item = {
                name: item
            };
        }
        const column = {
            ... item
        };
        column.name = `${column.name}`;
        if (typeof column.width !== 'number') {
            column.width = column.name.length;
        }
        column.width = Math.max(column.width, 3);
        return column;
    });

    // header
    const headers = [];
    columns.forEach((column) => {
        headers.push(renderCell(column.name, column));
    });
    lines.push(renderLine(headers, padding));

    const hyphens = [];
    columns.forEach((column) => {
        hyphens.push(renderHyphen(column));
    });
    lines.push(renderLine(hyphens, padding));

    // rows
    data.rows.forEach((row) => {
        const cells = [];
        columns.forEach((column, i) => {
            let cellValue = '';
            if (Array.isArray(row)) {
                cellValue += row[i];
            } else {
                let v = row[column.id];
                if (typeof v === 'undefined' || v === null) {
                    v = options.nullPlaceholder;
                }
                if (column.formatter) {
                    v = column.formatter(v, row, column);
                }
                cellValue += v;
            }
            cells.push(renderCell(cellValue, column));
        });
        lines.push(renderLine(cells, padding));
    });

    return lines.join(os.EOL) + os.EOL;

};


module.exports = markdownGrid;
