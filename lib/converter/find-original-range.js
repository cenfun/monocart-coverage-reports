const Util = require('../utils/util.js');

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
    return [startItem, endItem];

};

// ========================================================================================================

const getBlockStartPosition = (originalText) => {
    // start block characters

    // originalText: 'argument) {',
    // generatedLeft: 'o',
    // generatedRight: '&&'

    // function/block could be started with {(
    const startBlockIndex = originalText.search(/[<{(]/);
    if (startBlockIndex !== -1) {
        return startBlockIndex;
    }

    // end a block
    const list = ['>', '}', ')'];
    for (const s of list) {
        const endBlockIndex = originalText.lastIndexOf(s);
        if (endBlockIndex !== -1) {
            return endBlockIndex + 1;
        }
    }

    return -1;
};

const getBlockEndPosition = (originalText) => {
    // generatedText: 'e),',
    // generatedPos: 2,
    // originalText: 'prop))'

    // generatedText: ' = false)',
    // generatedPos: 8,
    // originalText: '=false"'

    // generatedText: '), 1 /* TEXT */)])])) : (0,vue__...)("v-if", true)], 6 /* CLASS, STYLE */);',
    // generatedPos: 17,
    // originalText: ' }}</slot>'

    const list = ['>', '}', ')'];
    for (const s of list) {
        const endBlockIndex = originalText.lastIndexOf(s);
        if (endBlockIndex !== -1) {
            return endBlockIndex + 1;
        }
    }

    const startBlockIndex = originalText.search(/[<{(]/);
    if (startBlockIndex !== -1) {
        return startBlockIndex;
    }

    return -1;
};

const getCommonFixedPosition = (generatedText, generatedPos, originalText, blankPos) => {

    // length before trim end
    // const oLen = originalText.length;

    // trim end, remove \r\n and \n
    generatedText = generatedText.trimEnd();
    originalText = originalText.trimEnd();

    // no content
    if (!originalText.length) {
        return {
            pos: blankPos
        };
    }

    // same content
    if (originalText === generatedText) {
        return {
            pos: generatedPos
        };
    }


    // =============================
    // length not change, replace " to '
    originalText = originalText.replace(/"/g, "'");
    generatedText = generatedText.replace(/"/g, "'");

    // generatedText: '"false";\n',
    // originalText: "'false';\r\n    ",
    // generatedPos: 7

    // same content too
    if (originalText === generatedText) {
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

    const generatedLeft = generatedText.slice(0, generatedPos);
    if (originalText.startsWith(generatedLeft)) {
        return {
            pos: generatedPos
        };
    }

    // ============================
    // right matched

    const generatedRight = generatedText.slice(generatedPos);
    if (originalText.endsWith(generatedRight)) {
        return {
            pos: originalText.length - generatedRight.length
        };
    }

    // console.log('====================================================================');
    // console.log('common position can NOT be fixed');
    // console.log([generatedLeft, generatedPos, generatedRight]);
    // console.log([originalText]);

};

const getFixedStartPosition = (generatedText, generatedPos, originalText, originalType) => {

    // when blank start from right
    const blankPos = originalText.length;
    const commonPos = getCommonFixedPosition(generatedText, generatedPos, originalText, blankPos);
    if (commonPos) {
        return commonPos.pos;
    }

    // ============================
    // {} () <>
    const blockIndex = getBlockStartPosition(originalText);
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

    const indexEndBlock = originalText.search(/(?<=[;,:"'\s])/);
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

const getFixedEndPosition = (generatedText, generatedPos, originalText, originalType) => {

    // when blank end from left
    const blankPos = 0;
    const commonPos = getCommonFixedPosition(generatedText, generatedPos, originalText, blankPos);
    if (commonPos) {
        return commonPos.pos;
    }

    // ============================
    // {} () <>
    const blockIndex = getBlockEndPosition(originalText);
    if (blockIndex !== -1) {
        return blockIndex;
    }

    // console.log('====================================================================');
    // console.log('end position can NOT be fixed');
    // console.log({
    //     generatedText,
    //     generatedPos,
    //     originalText
    // });

    // ============================
    // can NOT be fixed
    // to the line end
    return originalText.length;
};

// ========================================================================================================

const getFixedOriginalStart = (start, mappings, state, originalResult) => {
    const { originalState, crossStart } = originalResult;
    // cross file from start
    if (crossStart) {
        return 0;
    }

    const [s1, s2] = mappings;

    const generatedLocator = state.locator;
    const generatedText = generatedLocator.getSlice(s1.generatedOffset, s2.generatedOffset);
    const generatedPos = start - s1.generatedOffset;

    const originalLocator = originalState.locator;
    const originalText = originalLocator.getSlice(s1.originalOffset, s2.originalOffset);
    const originalType = originalState.type;

    const originalPos = getFixedStartPosition(generatedText, generatedPos, originalText, originalType);

    return s1.originalOffset + originalPos;
};

const getFixedEndMapping = (end, mappings, state, originalResult) => {
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

        return e1.originalEndOffset;
    }

    const generatedLocator = state.locator;
    const generatedText = generatedLocator.getSlice(e1.generatedOffset, e2.generatedOffset);
    const generatedPos = end - e1.generatedOffset;

    const originalText = originalLocator.getSlice(e1.originalOffset, e2.originalOffset);
    const originalType = originalState.type;

    const originalPos = getFixedEndPosition(generatedText, generatedPos, originalText, originalType);

    return e1.originalOffset + originalPos;
};

// ========================================================================================================

const getOriginalStart = (start, startMapping, state, originalResult) => {
    if (Array.isArray(startMapping)) {
        return getFixedOriginalStart(start, startMapping, state, originalResult);
    }
    // Exact match
    return startMapping.originalOffset;
};

const getOriginalEnd = (end, endMapping, state, originalResult) => {
    if (Array.isArray(endMapping)) {
        return getFixedEndMapping(end, endMapping, state, originalResult);
    }
    // Exact match
    return endMapping.originalOffset;
};

// ========================================================================================================

const checkIndexes = (startIndexes, endIndexes) => {

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
    const startIndexes = [].concat(startMappings).map((it) => it.sourceIndex);
    const endIndexes = [].concat(endMappings).map((it) => it.sourceIndex);
    const result = checkIndexes(startIndexes, endIndexes);
    if (result.error) {
        return {
            error: true,
            errors: [`invalid source indexes: ${Util.EC.yellow(`${startIndexes} ~ ${endIndexes}`)}`]
        };
    }

    const {
        sourceIndex, crossStart, crossEnd
    } = result;
    const originalState = originalMap.get(sourceIndex);
    if (!originalState) {
        return {
            error: true,
            errors: [`not found original state: ${Util.EC.yellow(sourceIndex)}`]
        };
    }

    return {
        originalState,
        crossStart,
        crossEnd,
        sourceIndex,
        startIndexes,
        endIndexes
    };
};

const findOriginalRange = (start, end, state, originalMap) => {

    const { sourcePath, decodedMappings } = state;
    // possible no length
    if (decodedMappings.length < 2) {
        return {
            error: true,
            start,
            end,
            sourcePath,
            errors: ['not found decoded mappings']
        };
    }

    // start: inclusive
    // end: exclusive

    const startMappings = findMapping(decodedMappings, start);
    const endMappings = findMapping(decodedMappings, end);
    // could be 4 mappings

    const originalResult = getOriginalState(startMappings, endMappings, originalMap);
    if (originalResult.error) {
        return {
            error: true,
            start,
            end,
            sourcePath,
            errors: originalResult.errors
        };
    }

    const originalStart = getOriginalStart(start, startMappings, state, originalResult);
    const originalEnd = getOriginalEnd(end, endMappings, state, originalResult);

    // range start > end
    if (originalStart > originalEnd) {
        return {
            error: true,
            start,
            end,
            sourcePath,
            errors: [`original start > end: ${Util.EC.blue(`${originalStart} > ${originalEnd}`)}`]
        };
    }

    const { originalState } = originalResult;

    return {
        start: originalStart,
        end: originalEnd,
        originalState
    };

};

module.exports = findOriginalRange;
