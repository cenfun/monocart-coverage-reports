const { decode } = require('@jridgewell/sourcemap-codec');

function getLine(arr, index) {
    for (let i = arr.length; i <= index; i++) {
        arr[i] = [];
    }
    return arr[index];
}

function addMappings(options, sourcesOffset) {

    const {
        input,
        lineOffset,
        columnOffset,
        stopLine,
        stopColumn
    } = options;

    const decoded = decode(input.mappings);
    const COLUMN = 0;
    const SOURCES_INDEX = 1;
    const SOURCE_LINE = 2;
    const SOURCE_COLUMN = 3;

    for (let i = 0; i < decoded.length; i++) {
        const lineI = lineOffset + i;

        if (lineI > stopLine) {
            return;
        }

        const out = getLine(options.decodedMappings, lineI);
        const cOffset = i === 0 ? columnOffset : 0;

        const line = decoded[i];
        for (let j = 0; j < line.length; j++) {
            const seg = line[j];
            const column = cOffset + seg[COLUMN];

            if (lineI === stopLine && column >= stopColumn) {
                return;
            }

            if (seg.length === 1) {
                out.push([column]);
                continue;
            }

            const sourcesIndex = sourcesOffset + seg[SOURCES_INDEX];
            const sourceLine = seg[SOURCE_LINE];
            const sourceColumn = seg[SOURCE_COLUMN];
            out.push([column, sourcesIndex, sourceLine, sourceColumn]);
        }
    }
}

function addSection(options) {

    const { input } = options;

    const { sections } = input;
    if (sections) {
        return flatten(options);
    }

    const sourcesOffset = options.sources.length;

    if (!input.sourcesContent) {
        input.sourcesContent = [];
    }
    input.sources.forEach((src, i) => {
        options.sources.push(src);
        options.sourcesContent.push(input.sourcesContent[i] || null);
    });

    addMappings(options, sourcesOffset);

}

function flatten(options) {

    const {
        input,
        lineOffset,
        columnOffset,
        stopLine,
        stopColumn
    } = options;

    const { sections } = input;

    for (let i = 0, l = sections.length; i < l; i++) {
        const { map, offset } = sections[i];

        let sl = stopLine;
        let sc = stopColumn;
        if (i + 1 < sections.length) {
            const nextOffset = sections[i + 1].offset;
            sl = Math.min(stopLine, lineOffset + nextOffset.line);

            if (sl === stopLine) {
                sc = Math.min(stopColumn, columnOffset + nextOffset.column);
            } else if (sl < stopLine) {
                sc = columnOffset + nextOffset.column;
            }
        }

        options.input = map;
        options.lineOffset = lineOffset + offset.line;
        options.columnOffset = columnOffset + offset.column;
        options.stopLine = sl;
        options.stopColumn = sc;

        addSection(options);
    }
}

const flattenSourceMaps = function(indexedMap, mapUrl) {

    const sections = indexedMap.sections;
    if (!sections) {
        return indexedMap;
    }

    const decodedMappings = [];
    const sources = [];
    const sourcesContent = [];
    const names = [];
    const ignoreList = [];

    const lineOffset = 0;
    const columnOffset = 0;
    const stopLine = Infinity;
    const stopColumn = Infinity;

    flatten({
        input: indexedMap,

        mapUrl,

        decodedMappings,
        sources,
        sourcesContent,

        names,
        ignoreList,

        lineOffset,
        columnOffset,
        stopLine,
        stopColumn
    });

    indexedMap.sources = sources;
    indexedMap.sourcesContent = sourcesContent;
    indexedMap.decodedMappings = decodedMappings;

    // console.log(decodedMappings);

    return indexedMap;
};

module.exports = {
    flattenSourceMaps
};
