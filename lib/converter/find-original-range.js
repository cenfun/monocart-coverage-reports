const Util = require('../utils/util.js');
const EC = Util.EC;

const findMapping = (list, offset) => {
    let start = 0;
    let end = list.length - 1;
    while (end - start > 1) {
        const i = Math.floor((start + end) * 0.5);
        const item = list[i];
        if (offset < item.generatedOffset) {
            end = i;
            continue;
        }
        if (offset > item.generatedOffset) {
            start = i;
            continue;
        }
        return list[i];
    }
    // last two items, less is start
    const startItem = list[start];
    if (offset === startItem.generatedOffset) {
        return startItem;
    }
    const endItem = list[end];
    if (offset === endItem.generatedOffset) {
        return endItem;
    }

    // between two mappings
    if (offset > startItem.generatedOffset && offset < endItem.generatedOffset) {
        return [startItem, endItem];
    }

    // not found the mappings

};

// ========================================================================================================

const getBlockStartPosition = (info) => {

    // originalText: 'argument) {',
    // generatedLeft: 'o',
    // generatedRight: '&&'

    const { originalLine } = info;

    // function/block could be started with {(
    const startBlockIndex = originalLine.search(/[<{(]/);
    if (startBlockIndex !== -1) {
        return startBlockIndex;
    }

    // end a block
    const list = ['>', '}', ')'];
    for (const s of list) {
        const endBlockIndex = originalLine.lastIndexOf(s);
        if (endBlockIndex !== -1) {
            return endBlockIndex + 1;
        }
    }

    return -1;
};

const getBlockEndPosition = (info) => {

    // generatedText: 'e),',
    // generatedPos: 2,
    // originalText: 'prop))'

    // generatedText: ' = false)',
    // generatedPos: 8,
    // originalText: '=false"'

    // generatedText: '), 1 /* TEXT */)])])) : (0,vue__...)("v-if", true)], 6 /* CLASS, STYLE */);',
    // generatedPos: 17,
    // originalText: ' }}</slot>'

    const { originalLine } = info;

    const list = ['>', '}', ')'];
    for (const s of list) {
        const endBlockIndex = originalLine.lastIndexOf(s);
        if (endBlockIndex !== -1) {
            return endBlockIndex + 1;
        }
    }

    const startBlockIndex = originalLine.search(/[<{(]/);
    if (startBlockIndex !== -1) {
        return startBlockIndex;
    }

    return -1;
};

// const getDiffPosition = () => {

// };


const getCommonFixedPosition = (info, direction) => {

    const {
        generatedText, generatedPos, originalText
    } = info;

    // never cross line, using first line
    // trim end remove \r\n and \n
    const generatedLines = generatedText.split(/\n/);
    const originalLines = originalText.split(/\n/);

    let generatedLine = generatedLines[0].trimEnd();
    let originalLine = originalLines[0].trimEnd();

    // no content
    if (!originalLine.length) {
        return {
            pos: direction === 'start' ? originalLines[0].length : 0
        };
    }

    // same content
    if (originalLine === generatedLine) {
        return {
            pos: generatedPos
        };
    }

    // before replacement
    info.generatedLine = generatedLine;
    info.originalLine = originalLine;

    // =============================
    // length not change, replace " to '
    generatedLine = generatedLine.replace(/"/g, "'");
    originalLine = originalLine.replace(/"/g, "'");

    // generatedText: '"false";\n',
    // originalText: "'false';\r\n    ",
    // generatedPos: 7

    // same content too
    if (originalLine === generatedLine) {
        return {
            pos: generatedPos
        };
    }

    // ============================
    // left matched

    // originalText: '1;',
    // generatedText: '1;else',
    // generatedLeft: '1;'

    // generatedText: '    var id = options.base ? item[0] + options.base : item[0];\r\n',
    // originalText: '    var id = options.base ? item[0] + options.base : item[0];\n',

    const generatedLeft = generatedLine.slice(0, generatedPos);
    if (originalLine.startsWith(generatedLeft)) {
        return {
            pos: generatedPos
        };
    }

    // ============================
    // right matched

    const generatedRight = generatedLine.slice(generatedPos);
    if (originalLine.endsWith(generatedRight)) {
        return {
            pos: originalLine.length - generatedRight.length
        };
    }

    // console.log('====================================================================');
    // console.log('common position can NOT be fixed');
    // console.log([generatedLeft, generatedPos, generatedRight]);
    // console.log([originalText]);

};

const getFixedStartPosition = (info) => {

    const commonPos = getCommonFixedPosition(info, 'start');
    if (commonPos) {
        return commonPos.pos;
    }

    // ============================
    // {} () <>
    const blockIndex = getBlockStartPosition(info);
    if (blockIndex !== -1) {
        return blockIndex;
    }

    // ============================
    // end characters

    // ends with ">" in vue
    // <span v-if="data.distFile">

    // originalText: '">',
    // generatedText: ' ? ((0,vue__.openBlock)(), '

    // originalMethod?.apply
    // originalText: '?.'  no ?

    const { originalLine } = info;
    const indexEndBlock = originalLine.search(/(?<=[;,:"'\s])/);
    if (indexEndBlock !== -1) {
        return indexEndBlock;
    }

    // console.log('====================================================================');
    // console.log('start position can NOT be fixed');
    // console.log({
    //     generatedText,
    //     generatedPos,
    //     originalText
    // });

    // ============================
    // can NOT be fixed
    // using original column
    return 0;
};

const getFixedEndPosition = (info) => {

    const commonPos = getCommonFixedPosition(info, 'end');
    if (commonPos) {
        return commonPos.pos;
    }

    // ============================
    // {} () <>
    const blockIndex = getBlockEndPosition(info);
    if (blockIndex !== -1) {
        return blockIndex;
    }

    // ============================
    // can NOT be fixed
    // to the line end
    return info.originalLine.length;
};

// ========================================================================================================

const getFixedOriginalStart = (start, mappings, state, originalResult) => {
    const { originalState, crossStart } = originalResult;
    // cross file from start
    if (crossStart) {
        return {
            originalStart: 0
        };
    }

    const [s1, s2] = mappings;

    // check original offset
    if (s1.originalOffset > s2.originalOffset) {
        return {
            error: true,
            errors: [`invalid original start offsets: ${EC.yellow(s1.originalOffset)} > ${EC.yellow(s2.originalOffset)}`]
        };
    }

    const generatedLocator = state.locator;
    const generatedText = generatedLocator.getSlice(s1.generatedOffset, s2.generatedOffset);
    const generatedPos = start - s1.generatedOffset;

    const originalLocator = originalState.locator;
    const originalText = originalLocator.getSlice(s1.originalOffset, s2.originalOffset);

    const originalPos = getFixedStartPosition({
        generatedText,
        generatedPos,
        originalText,
        start,
        originalState
    });

    return {
        originalStart: s1.originalOffset + originalPos
    };
};

const getFixedOriginalEnd = (end, mappings, state, originalResult) => {

    const { decodedMappings } = state;

    // end is exclusive, try previous one if exact match
    const prevMapping = findMapping(decodedMappings, end - 1);
    if (prevMapping && !Array.isArray(prevMapping)) {
        return {
            originalEnd: prevMapping.originalOffset + 1
        };
    }

    const { originalState, crossEnd } = originalResult;
    const originalLocator = originalState.locator;
    const [e1, e2] = mappings;

    // cross file until e1 line end (not file end)
    if (crossEnd) {

        if (!e1.originalEndOffset) {
            // line last one
            const line = originalLocator.getLine(e1.originalLine + 1);
            // last column
            const toEndLength = line.length - e1.originalColumn;
            e1.originalEndOffset = e1.originalOffset + toEndLength;
        }

        return {
            originalEnd: e1.originalEndOffset
        };
    }

    // check original offset
    if (e1.originalOffset > e2.originalOffset) {
        return {
            error: true,
            errors: [`invalid original end offsets: ${EC.yellow(e1.originalOffset)} > ${EC.yellow(e2.originalOffset)}`]
        };
    }

    const generatedLocator = state.locator;
    const generatedText = generatedLocator.getSlice(e1.generatedOffset, e2.generatedOffset);
    const generatedPos = end - e1.generatedOffset;

    const originalText = originalLocator.getSlice(e1.originalOffset, e2.originalOffset);

    const originalPos = getFixedEndPosition({
        generatedText,
        generatedPos,
        originalText,
        end,
        originalState
    });

    return {
        originalEnd: e1.originalOffset + originalPos
    };
};

// ========================================================================================================

const getOriginalStart = (start, startMapping, state, originalResult) => {
    if (Array.isArray(startMapping)) {
        return getFixedOriginalStart(start, startMapping, state, originalResult);
    }
    // Exact match
    return {
        originalStart: startMapping.originalOffset
    };
};

const getOriginalEnd = (end, endMapping, state, originalResult) => {
    if (Array.isArray(endMapping)) {
        return getFixedOriginalEnd(end, endMapping, state, originalResult);
    }
    // Exact match
    return {
        originalEnd: endMapping.originalOffset
    };
};

// ========================================================================================================

const checkSourceFileIndexes = (startIndexes, endIndexes) => {

    const checkIndex11 = (s1, e1) => {
        if (s1 === e1) {
            return {
                sourceIndex: s1
            };
        }
        return {
            error: true
        };
    };

    const checkIndex21 = (s1, s2, e1) => {
        if (s1 === e1 || s2 === e1) {
            if (s1 === s2) {
                return {
                    sourceIndex: e1
                };
            }
            return {
                crossStart: true,
                sourceIndex: e1
            };
        }
        return {
            error: true
        };
    };

    const checkIndex12 = (s1, e1, e2) => {
        if (s1 === e1 || s1 === e2) {
            if (e1 === e2) {
                return {
                    sourceIndex: s1
                };
            }
            return {
                crossEnd: true,
                sourceIndex: s1
            };
        }
        return {
            error: true
        };
    };

    const checkIndex22 = (s1, s2, e1, e2) => {
        // 4 same
        if (s1 === s2 && e1 === e2 && s1 === e1) {
            return {
                sourceIndex: s1
            };
        }

        if (e1 === e2) {
            return checkIndex21(s1, s2, e1);
        }

        if (s1 === s2) {
            return checkIndex12(s1, e1, e2);
        }

        if (s2 === e1) {
            return {
                crossStart: true,
                crossEnd: true,
                sourceIndex: s2
            };
        }

        // both between two mappings: 38,39 ~ 38,39
        // if (s1 === e1 && s2 === e2) {
        // }

        return {
            error: true
        };
    };

    // both exact matched
    if (startIndexes.length === 1 && endIndexes.length === 1) {
        return checkIndex11(startIndexes[0], endIndexes[0]);
    }

    if (startIndexes.length === 2 && endIndexes.length === 1) {
        return checkIndex21(startIndexes[0], startIndexes[1], endIndexes[0]);
    }

    if (startIndexes.length === 1 && endIndexes.length === 2) {
        return checkIndex12(startIndexes[0], endIndexes[0], endIndexes[1]);
    }

    // both 2 mappings
    return checkIndex22(startIndexes[0], startIndexes[1], endIndexes[0], endIndexes[1]);

};

const getOriginalState = (startMappings, endMappings, originalMap) => {

    // check source file indexes
    const startIndexes = [].concat(startMappings).map((it) => it.sourceIndex);
    const endIndexes = [].concat(endMappings).map((it) => it.sourceIndex);
    const originalResult = checkSourceFileIndexes(startIndexes, endIndexes);
    if (originalResult.error) {
        return {
            error: true,
            errors: [`invalid source indexes: ${EC.yellow(`${startIndexes} ~ ${endIndexes}`)}`]
        };
    }

    const {
        sourceIndex, crossStart, crossEnd
    } = originalResult;

    // if (crossStart || crossEnd) {
    //     console.log(EC.magenta('cross file'), EC.yellow(`${startIndexes} ~ ${endIndexes}`));
    // }

    const originalState = originalMap.get(sourceIndex);
    if (!originalState) {
        return {
            error: true,
            errors: [`not found original file: ${EC.yellow(sourceIndex)}`]
        };
    }

    return {
        // for debug
        // startIndexes,
        // endIndexes,

        sourceIndex,
        crossStart,
        crossEnd,
        originalState
    };
};

const findOriginalRange = (start, end, state, originalMap) => {

    const { sourcePath, decodedMappings } = state;

    const createMappingError = (errors) => {
        return {
            error: true,
            start,
            end,
            sourcePath,
            errors
        };
    };

    // possible no length
    if (decodedMappings.length < 2) {
        return createMappingError(['not found decoded mappings']);
    }

    // start: inclusive
    // end: exclusive
    // could be 4 mappings found

    const startMappings = findMapping(decodedMappings, start);
    if (!startMappings) {
        return {
            error: true,
            errors: ['not found start mappings']
        };
    }

    const endMappings = findMapping(decodedMappings, end);
    if (!endMappings) {
        return {
            error: true,
            errors: ['not found end mappings']
        };
    }

    const originalStateResult = getOriginalState(startMappings, endMappings, originalMap);
    if (originalStateResult.error) {
        return createMappingError(originalStateResult.errors);
    }

    const originalStartResult = getOriginalStart(start, startMappings, state, originalStateResult);
    if (originalStartResult.error) {
        return createMappingError(originalStartResult.errors);
    }

    const originalEndResult = getOriginalEnd(end, endMappings, state, originalStateResult);
    if (originalEndResult.error) {
        return createMappingError(originalEndResult.errors);
    }

    const { originalStart } = originalStartResult;
    const { originalEnd } = originalEndResult;

    // range start > end
    if (originalStart > originalEnd) {
        return createMappingError([`invalid original start > end: ${EC.yellow(originalStart)} > ${EC.yellow(originalEnd)}`]);
    }

    const { originalState } = originalStateResult;

    return {
        start: originalStart,
        end: originalEnd,
        originalState
    };

};

module.exports = findOriginalRange;
