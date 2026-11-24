import { encode } from '@jridgewell/sourcemap-codec';

// Node's strip mode preserves UTF-16 positions, except for a leading BOM.
// Map line boundaries and transitions between preserved/replaced text, rather
// than emitting a segment for every character. Keep replaced text mapped too:
// mappings describe coordinates, not whether TS syntax is executable.
const createNativeTypeScriptSourceMap = (url, originalSource, source) => {
    const offset = originalSource.startsWith('\uFEFF') ? 1 : 0;
    if (source.length + offset !== originalSource.length) {
        throw new Error(`Type stripping did not preserve source positions: ${url}`);
    }

    const mappings = [];
    const lineBreak = /\r\n|[\r\n\u2028\u2029]/g;
    let lineStart = 0;
    const addLine = (lineEnd) => {
        const line = mappings.length;
        const originalColumnOffset = line === 0 ? offset : 0;
        const segments = [];
        const addSegment = (column) => {
            segments.push([column, 0, line, column + originalColumnOffset]);
        };
        addSegment(0);
        let preserved;
        for (let i = lineStart; i < lineEnd; i++) {
            const current = source[i] === originalSource[i + offset];
            if (!current && (/[\r\n\u2028\u2029]/).test(originalSource[i + offset])) {
                throw new Error(`Type stripping changed line endings: ${url}`);
            }
            if (i > lineStart && current !== preserved) {
                addSegment(i - lineStart);
            }
            preserved = current;
        }
        if (lineEnd > lineStart) {
            addSegment(lineEnd - lineStart);
        }
        mappings.push(segments);
    };

    let match;
    while ((match = lineBreak.exec(source)) !== null) {
        addLine(match.index);
        if (originalSource.slice(match.index + offset, lineBreak.lastIndex + offset) !== match[0]) {
            throw new Error(`Type stripping changed line endings: ${url}`);
        }
        lineStart = lineBreak.lastIndex;
    }
    addLine(source.length);

    return {
        version: 3,
        sources: [url],
        sourcesContent: [originalSource],
        names: [],
        mappings: encode(mappings)
    };
};

export { createNativeTypeScriptSourceMap };
