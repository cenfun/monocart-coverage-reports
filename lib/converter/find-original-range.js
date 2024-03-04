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

const getBlockStartPosition = (originalLineText) => {
    // originalText: 'argument) {',
    // generatedLeft: 'o',
    // generatedRight: '&&'

    // function/block could be started with {(
    const startBlockIndex = originalLineText.search(/[<{(]/);
    if (startBlockIndex !== -1) {
        return {
            pos: startBlockIndex
        };
    }

    // end a block
    const list = ['>', '}', ')'];
    for (const s of list) {
        const endBlockIndex = originalLineText.lastIndexOf(s);
        if (endBlockIndex !== -1) {
            return {
                pos: endBlockIndex + 1
            };
        }
    }

    // ============================
    // end characters

    // ends with ">" in vue
    // <span v-if="data.distFile">

    // originalText: '">',
    // generatedText: ' ? ((0,vue__.openBlock)(), '

    // originalMethod?.apply
    // originalText: '?.'  no ?

    const indexEndBlock = originalLineText.search(/(?<=[;,:"'\s])/);
    if (indexEndBlock !== -1) {
        return {
            pos: indexEndBlock
        };
    }

};

const getBlockEndPosition = (originalLineText) => {

    // generatedText: 'e),',
    // generatedPos: 2,
    // originalText: 'prop))'

    // generatedText: ' = false)',
    // generatedPos: 8,
    // originalText: '=false"'

    // generatedText: '), 1 /* TEXT */)])])) : (0,vue__...)("v-if", true)], 6 /* CLASS, STYLE */);',
    // generatedPos: 17,
    // originalText: ' }}</slot>'

    // end marks
    const list = ['>', '}', ')'];
    for (const s of list) {
        const endBlockIndex = originalLineText.lastIndexOf(s);
        if (endBlockIndex !== -1) {
            return {
                pos: endBlockIndex + 1
            };
        }
    }

    const startBlockIndex = originalLineText.search(/[<{(]/);
    if (startBlockIndex !== -1) {
        return {
            pos: startBlockIndex
        };
    }

};

const getComparedPosition = (info, direction) => {

    let gt = info.generatedText;
    const gp = info.generatedPos;
    let ot = info.originalText;

    // before trim
    const oLen = ot.length;

    gt = gt.trimEnd();
    ot = ot.trimEnd();

    // no content after trim
    if (!ot.length) {
        return {
            pos: direction === 'start' ? oLen : 0
        };
    }

    // same content
    if (gt === ot) {
        return {
            pos: gp
        };
    }

    // =============================

    // generatedText: '"false";\n',
    // originalText: "'false';\r\n    ",
    // generatedPos: 7

    // length not change, replace " to '
    gt = gt.replace(/"/g, "'");
    ot = ot.replace(/"/g, "'");


    // same content too
    if (gt === ot) {
        return {
            pos: gp
        };
    }

    // ============================
    // left matched

    // originalText: '1;',
    // generatedText: '1;else',
    // generatedLeft: '1;'

    // generatedText: '    var id = options.base ? item[0] + options.base : item[0];\r\n',
    // originalText: '    var id = options.base ? item[0] + options.base : item[0];\n',

    const left = gt.slice(0, gp);
    if (ot.startsWith(left)) {
        return {
            pos: gp
        };
    }

    // ============================
    // right matched
    // only for original first line text

    const olt = info.originalLineText;
    const right = gt.slice(gp);
    if (olt.endsWith(right)) {
        return {
            pos: olt.length - right.length
        };
    }

};

const initOriginalLineText = (info) => {
    const originalText = info.originalText;
    // never cross line, using first line of original text
    // trim end remove \r\n and \n
    const originalLines = originalText.split(/\n/);
    if (originalLines.length === 1) {
        // already single line
        info.originalLineText = originalText.trimEnd();
        info.originalSingle = true;
        return;
    }
    // multiple liens
    info.originalLineText = originalLines[0].trimEnd();
};

const getSimilarPosition = (info, direction) => {

    initOriginalLineText(info);

    const textPos = getComparedPosition(info, direction);
    if (textPos) {
        return textPos;
    }

    if (info.originalSingle) {
        return;
    }

    // multiple lines
    const { generatedPos, originalLineText } = info;
    // generatedPos not in first line
    if (generatedPos > originalLineText.length) {
        return;
    }

    const linePos = getComparedPosition(info, direction);
    if (linePos) {
        return linePos;
    }

    // console.log('====================================================================');
    // console.log(`${EC.magenta(direction)} similar position can NOT be fixed`);
    // console.log({
    //     sourcePath: info.originalState.sourcePath,
    //     generatedText,
    //     generatedPos,
    //     originalText
    // });

};

const getFixedPosition = (info, direction) => {

    const similarPos = getSimilarPosition(info, direction);
    if (similarPos) {
        return similarPos.pos;
    }


    // generatedText: never cross lines
    // originalText: could be multiple lines
    // originalLineText: single line originalText
    const { originalLineText } = info;

    if (direction === 'start') {
        const blockPos = getBlockStartPosition(originalLineText);
        if (blockPos) {
            return blockPos.pos;
        }
        return 0;
    }

    const blockPos = getBlockEndPosition(originalLineText);
    if (blockPos) {
        return blockPos.pos;
    }
    return originalLineText.length;
};

// ========================================================================================================

const getOriginalEndOffset = (m, rangeInfo) => {
    if (!m.originalEndOffset) {
        const line = rangeInfo.originalState.locator.getLine(m.originalLine + 1);
        m.originalEndOffset = line ? line.end : m.originalOffset;
    }
    return m.originalEndOffset;
};

const getOriginalText = (m1, m2, rangeInfo) => {
    const originalLocator = rangeInfo.originalState.locator;

    const o1 = m1.originalOffset;
    const o2 = m2.originalOffset;

    // o1 < o2: most of time
    if (o1 < o2) {
        // could be multiple lines for original text
        return {
            originalOffset: o1,
            originalText: originalLocator.getSlice(o1, o2)
        };
    }

    // esbuild fixing two mapping have same original
    // m1 to end line
    if (o1 === o2) {
        const originalEndOffset = getOriginalEndOffset(m1, rangeInfo);
        return {
            originalOffset: o1,
            originalText: originalLocator.getSlice(o1, originalEndOffset)
        };
    }

    // o1 > o2: should be wrong sourcemap

    // just reverse offsets if few cross lines
    const crossLines = m1.originalLine - m2.originalLine;
    if (crossLines < 2) {
        return {
            originalOffset: o2,
            originalText: originalLocator.getSlice(o2, o1)
        };
    }

    // if (direction === 'start') {
    // should be m2 ?
    // console.log(direction, rangeInfo.originalState.sourcePath);
    // console.log(m1, m2);
    // }

    // should be wrong, ignore m2
    const originalEndOffset = getOriginalEndOffset(m1, rangeInfo);
    return {
        originalOffset: o1,
        originalText: originalLocator.getSlice(o1, originalEndOffset)
    };

};

const getGeneratedText = (m1, m2, state, offset) => {
    const generatedLocator = state.locator;

    const o1 = m1.generatedOffset;
    const o2 = m2.generatedOffset;

    // same line
    if (m1.generatedLine === m2.generatedLine) {
        return {
            generatedText: generatedLocator.getSlice(o1, o2),
            generatedPos: offset - o1
        };
    }

    // =======================================
    // different lines
    // never cross lines

    // 1-base
    const lineInfo = generatedLocator.offsetToLocation(offset);
    // 0-base
    const targetLine = lineInfo.line - 1;

    // m1 p (case 1, right to end)
    // p (case 2, mid line)
    // p (case 3) m2

    // case 1
    if (targetLine === m1.generatedLine) {
        return {
            generatedText: generatedLocator.getSlice(o1, lineInfo.end),
            generatedPos: offset - o1
        };
    }

    // case 3
    if (targetLine === m2.generatedLine) {
        return {
            generatedText: generatedLocator.getSlice(lineInfo.start, o2),
            generatedPos: offset - lineInfo.start
        };
    }

    // case 2
    return {
        generatedText: lineInfo.text,
        generatedPos: offset - lineInfo.start
    };

};

// ========================================================================================================

const getFixedOriginalStart = (start, mappings, state, rangeInfo) => {

    const [m1, m2] = mappings;
    const { originalState, crossStart } = rangeInfo;

    // cross file from start of line
    if (crossStart) {
        return {
            originalStart: m2.originalOffset
        };
    }

    const direction = 'start';
    const { originalText, originalOffset } = getOriginalText(m1, m2, rangeInfo);
    const { generatedText, generatedPos } = getGeneratedText(m1, m2, state, start);

    const info = {
        generatedText,
        generatedPos,
        originalText,
        originalState
    };

    const originalPos = getFixedPosition(info, direction);

    // if (start === 2660) {
    //     console.log('=====================================================');
    //     console.log('fixed start', originalState.sourcePath);
    //     console.log({
    //         generatedText,
    //         generatedPos,
    //         originalText,
    //         originalPos
    //     });
    // }

    return {
        originalStart: originalOffset + originalPos
    };
};

const getFixedOriginalEnd = (end, mappings, state, rangeInfo) => {

    const [m1, m2] = mappings;
    const { originalState, crossEnd } = rangeInfo;

    // cross file until e1 line end (not file end)
    if (crossEnd) {
        const originalEndOffset = getOriginalEndOffset(m1, rangeInfo);
        return {
            originalEnd: originalEndOffset
        };
    }

    // end is exclusive
    // quick check previous one if exact match
    // most of case is matching "}"
    if (m1.generatedOffset === end - 1) {
        return {
            originalEnd: m1.originalOffset + 1
        };
    }

    // quick check next one if exact match
    // most of case is same string
    if (m2.generatedOffset === end + 1) {
        const gt = state.locator.source[end];
        const oi = m2.originalOffset - 1;
        const ot = originalState.locator.source[oi];
        // it could be ; but it quite far away
        if (gt === ot && [';', ','].includes(gt)) {
            return {
                originalEnd: oi
            };
        }

        // Not applicable
        // console.log('==================================');
        // console.log({
        //     gp: state.sourcePath,
        //     g: end,
        //     gt,
        //     op: originalState.sourcePath,
        //     o: oi,
        //     ot
        // });
    }

    const direction = 'end';
    const { originalText, originalOffset } = getOriginalText(m1, m2, rangeInfo);
    const { generatedText, generatedPos } = getGeneratedText(m1, m2, state, end);

    const info = {
        offset: end,
        generatedText,
        generatedPos,
        originalText,
        originalState
    };

    const originalPos = getFixedPosition(info, direction);

    // if (end === 1304578) {
    //     console.log('=====================================================');
    //     console.log('fixed end', originalState.sourcePath);
    //     console.log({
    //         generatedText,
    //         generatedPos,
    //         originalText,
    //         originalPos,
    //         originalLineText: info.originalLineText
    //     });
    // }

    return {
        originalEnd: originalOffset + originalPos
    };
};

// ========================================================================================================

const getOriginalStart = (start, startMapping, state, rangeInfo) => {
    if (Array.isArray(startMapping)) {
        return getFixedOriginalStart(start, startMapping, state, rangeInfo);
    }
    // Exact match
    return {
        originalStart: startMapping.originalOffset
    };
};

const getOriginalEnd = (end, endMapping, state, rangeInfo) => {
    if (Array.isArray(endMapping)) {
        return getFixedOriginalEnd(end, endMapping, state, rangeInfo);
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
    const rangeInfo = checkSourceFileIndexes(startIndexes, endIndexes);
    if (rangeInfo.error) {
        return {
            error: true,
            errors: [`invalid source indexes: ${EC.yellow(`${startIndexes} ~ ${endIndexes}`)}`]
        };
    }

    const {
        sourceIndex, crossStart, crossEnd
    } = rangeInfo;

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

const getMappingInfo = (decodedMappings, start, end) => {
    // possible no length
    if (decodedMappings.length < 2) {
        return {
            error: true,
            errors: ['invalid decoded mappings (length < 2)']
        };
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

    return {
        startMappings,
        endMappings
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

    const mappingInfo = getMappingInfo(decodedMappings, start, end);
    if (mappingInfo.error) {
        return createMappingError(mappingInfo.errors);
    }

    const { startMappings, endMappings } = mappingInfo;

    const rangeInfo = getOriginalState(startMappings, endMappings, originalMap);
    if (rangeInfo.error) {
        return createMappingError(rangeInfo.errors);
    }

    const originalStartResult = getOriginalStart(start, startMappings, state, rangeInfo);
    if (originalStartResult.error) {
        return createMappingError(originalStartResult.errors);
    }

    const originalEndResult = getOriginalEnd(end, endMappings, state, rangeInfo);
    if (originalEndResult.error) {
        return createMappingError(originalEndResult.errors);
    }

    const { originalStart } = originalStartResult;
    const { originalEnd } = originalEndResult;

    // range start > end
    if (originalStart > originalEnd) {
        return createMappingError([`invalid original start > end: ${EC.yellow(originalStart)} > ${EC.yellow(originalEnd)}`]);
    }

    const { originalState } = rangeInfo;

    return {
        start: originalStart,
        end: originalEnd,
        originalState
    };

};

module.exports = findOriginalRange;
