const { diffSequence } = require('../packages/monocart-coverage-vendor.js');
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

const alignText = (gt, ot, info) => {

    const { diffCache } = info.state;

    if (diffCache.has(gt)) {
        const subMap = diffCache.get(gt);
        if (subMap.has(ot)) {
            return subMap.get(ot);
        }
    }

    const toList = (s) => {
        return s.split('').map((v, i) => {
            return {
                index: i,
                value: v
            };
        });
    };

    const mergeList = (gList, oList) => {
        const oLen = oList.length;
        if (!oLen) {
            return;
        }
        const gLen = gList.length;
        if (gLen === oLen) {
            gList.forEach((item, i) => {
                item.original = oList[i];
            });
        }
    };

    const gl = toList(gt);
    const ol = toList(ot);

    // console.log(gl);
    // console.log(ol);

    const commonItems = [];
    diffSequence(gl.length, ol.length, (gi, oi) => {
        return gl[gi].value === ol[oi].value;
    }, (len, gi, oi) => {
        commonItems.push([gi, oi, len]);
    });

    // console.log(commonItems);
    // console.log('================================================================');
    // merge list
    // previous index
    let gpi = 0;
    let opi = 0;
    commonItems.forEach(([gi, oi, len]) => {

        if (gpi !== gi) {
            const gList = gl.slice(gpi, gi);
            const oList = ol.slice(opi, oi);
            mergeList(gList, oList);
        }

        for (let i = 0; i < len; i++) {

            const gii = gi + i;
            const oii = oi + i;
            const gItem = gl[gii];
            gItem.original = ol[oii];

            // matching a word end
            if (i === len - 1 && len > 1) {
                gItem.wordEnd = true;
            }

        }
        gpi = gi + len;
        opi = oi + len;
    });

    // console.log(JSON.stringify(data.gt));
    // console.log(JSON.stringify(data.ot));
    if (gpi < gl.length && opi < ol.length) {
        const gList = gl.slice(gpi);
        const oList = ol.slice(opi);
        mergeList(gList, oList);
    }

    if (diffCache.has(gt)) {
        const subMap = diffCache.get(gt);
        subMap.set(ot, gl);
    } else {
        const subMap = new Map();
        diffCache.set(gt, subMap);
        subMap.set(ot, gl);
    }

    // console.log(gl);
    return gl;
};

const getWordEndPosition = (list, gp, direction) => {
    // for end only
    if (direction !== 'end') {
        return;
    }

    const prev = list[gp - 1];
    if (prev && prev.original && prev.wordEnd) {
        const op = prev.original.index + 1;
        // console.log(gp, JSON.stringify(gt));
        // console.log(op, JSON.stringify(ot));
        return {
            pos: op
        };
    }
};

const getAlignPosition = (info, direction) => {

    const gt = info.generatedText;
    const gp = info.generatedPos;
    const ot = info.originalText;

    // const alignTextItem = {
    //     gt, ot, gp
    // };
    // info.state.alignTextList.push(it);

    // there is no need to align for long text
    const maxLength = 100;
    if (gt.length > maxLength || ot.length > maxLength) {
        // console.log(gt.length, ot.length, gp);
        return;
    }

    // generatedText: '"false";\n',
    // originalText: "'false';\r\n    ",
    // generatedPos: 7

    // left matched

    // originalText: '1;',
    // generatedText: '1;else',
    // generatedLeft: '1;'

    // right matched
    // only for original first line text

    // exclusive
    const list = alignText(gt, ot, info);
    const item = list[gp];
    if (item && item.original) {

        // alignTextItem.op = item.original.index;

        return {
            pos: item.original.index
        };
    }

    // inclusive, for end only
    return getWordEndPosition(list, gp, direction);

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

// ========================================================================================================

const getComparedPosition = (info, direction) => {

    const gt = info.generatedText;
    const gp = info.generatedPos;
    const ot = info.originalText;
    const olt = info.originalLineText;

    // seems direction is start only
    if (gp === 0) {
        return;
    }

    // whole generated text
    if (gp >= gt.length) {
        // console.log(JSON.stringify(gt), gt.length, gp);
        // console.log(JSON.stringify(ot));
        return {
            pos: olt.length
        };
    }

    // =============================
    // trim

    const gtt = gt.trim();
    // no generated content after trim
    if (!gtt) {
        return;
    }

    const ott = ot.trim();
    // no original content after trim
    if (!ott) {
        return {
            pos: direction === 'start' ? ot.length : 0
        };
    }

    // same content
    if (gtt === ott) {
        // fix indent
        const blankBlock = /\S/;
        const gi = gt.search(blankBlock);
        const oi = ot.search(blankBlock);

        return {
            pos: gp - gi + oi
        };
    }

    // =============================

    return getAlignPosition(info, direction);

};


const getSimilarPosition = (info, direction) => {

    const originalText = info.originalText;
    // never cross line, using first line of original text
    // trim end remove \r\n and \n
    const originalLines = originalText.split(/\n/);
    if (originalLines.length === 1) {
        // already single line
        info.originalLineText = originalText.trimEnd();
    } else {
        // multiple liens
        info.originalLineText = originalLines[0].trimEnd();
    }

    // no need comparison for fake source
    if (info.state.fake) {
        return;
    }

    const textPos = getComparedPosition(info, direction);
    if (textPos) {
        return textPos;
    }

    // console.log('====================================================================');
    // console.log(`${EC.magenta(direction)} similar position can NOT be fixed`, info.originalState.sourcePath);
    // console.log({
    //     direction,
    //     generatedText: info.generatedText,
    //     generatedPos: info.generatedPos,
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

const getOriginalEndOffset = (m, originalState) => {
    if (!m.originalEndOffset) {
        const line = originalState.locator.getLine(m.originalLine + 1);
        m.originalEndOffset = line ? line.end : m.originalOffset;
    }
    return m.originalEndOffset;
};

const getOriginalText = (m1, m2, originalState, startNextLine) => {
    const originalLocator = originalState.locator;

    const o1 = m1.originalOffset;
    const o2 = m2.originalOffset;
    const sameLine = m2.originalLine === m1.originalLine;

    // o1 < o2: most of time
    if (o1 < o2) {

        // could be in comments
        // it must be wrong sourcemap, do not fix it here
        // if (originalLocator.lineParser.commentParser.isComment(o1, o2)) {
        //     console.log('in comments', originalLocator.getSlice(o1, o2), originalLocator.offsetToLocation(o1), originalLocator.offsetToLocation(o2), cache.originalState.sourcePath);
        //     return {
        //         originalOffset: o1,
        //         originalText: ''
        //     };
        // }

        if (sameLine) {
            return {
                originalOffset: o1,
                originalText: originalLocator.getSlice(o1, o2)
            };
        }

        // start from next line
        if (startNextLine) {
            const nextLine = originalState.locator.getLine(m1.originalLine + 2);
            if (nextLine) {
                // console.log(nextLine);
                return {
                    originalOffset: nextLine.start + nextLine.indent,
                    originalText: nextLine.text.slice(nextLine.indent)
                };
            }
        }

        // could be multiple lines for original text
        return {
            originalOffset: o1,
            originalText: originalLocator.getSlice(o1, getOriginalEndOffset(m1, originalState))
        };
    }

    // esbuild fixing two mapping have same original
    // m1 to end line
    if (o1 === o2) {
        return {
            originalOffset: o1,
            originalText: originalLocator.getSlice(o1, getOriginalEndOffset(m1, originalState))
        };
    }

    // o1 > o2: should be wrong sourcemap

    // just reverse offsets if same line
    if (sameLine) {
        return {
            originalOffset: o2,
            originalText: originalLocator.getSlice(o2, o1)
        };
    }

    // if (direction === 'start') {
    // should be m2 ?
    // console.log(direction, cache.originalState.sourcePath);
    // console.log(m1, m2);
    // }

    // should be wrong, ignore m2
    return {
        originalOffset: o1,
        originalText: originalLocator.getSlice(o1, getOriginalEndOffset(m1, originalState))
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
const getFunctionName = (mp, state, options) => {
    if (options.checkName && typeof mp.nameIndex !== 'undefined') {
        return state.sourceMapNames[mp.nameIndex];
    }
};

const getFixedOriginalStart = (start, mappings, state, cache, options) => {

    const [m1, m2] = mappings;
    const { originalState, crossStart } = cache;

    // cross file from start of line
    if (crossStart) {
        return {
            originalStart: m2.originalOffset,
            originalName: getFunctionName(m2, state, options)
        };
    }

    // skip last mapping
    let startNextLine = false;
    if (m1.last) {
        const locStart = state.locator.offsetToLocation(start);
        // 1-base
        const lineIndex = locStart.line - 1;
        if (lineIndex > m1.generatedLine) {
            startNextLine = true;
            // console.log(originalState.sourcePath, start, m1, m2);
        }
    }

    const { originalText, originalOffset } = getOriginalText(m1, m2, originalState, startNextLine);
    const { generatedText, generatedPos } = getGeneratedText(m1, m2, state, start);
    const direction = 'start';

    const info = {
        state,
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
        originalStart: originalOffset + originalPos,
        originalName: getFunctionName(m1, state, options)
    };
};

const getFixedOriginalEnd = (end, mappings, state, cache) => {

    const [m1, m2] = mappings;
    const { originalState, crossEnd } = cache;

    // cross file until e1 line end (not file end)
    if (crossEnd) {
        const originalEndOffset = getOriginalEndOffset(m1, originalState);
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


    const { originalText, originalOffset } = getOriginalText(m1, m2, originalState);
    const { generatedText, generatedPos } = getGeneratedText(m1, m2, state, end);
    const direction = 'end';

    const info = {
        state,
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

const getOriginalStartPosition = (cache, state, options) => {

    const { start, startMappings } = cache;

    if (Array.isArray(startMappings)) {
        return getFixedOriginalStart(start, startMappings, state, cache, options);
    }

    // Exact match
    return {
        originalStart: startMappings.originalOffset,
        originalName: getFunctionName(startMappings, state, options)
    };
};

const getOriginalExclusiveEnd = (cache, state) => {
    // end, exclusive mappings
    const { end } = cache;
    const { decodedMappings } = state;
    const endMappings = findMapping(decodedMappings, end);
    if (!endMappings) {
        return {
            error: true,
            errors: ['not found end mappings']
        };
    }
    if (Array.isArray(endMappings)) {
        return getFixedOriginalEnd(end, endMappings, state, cache);
    }

    // Exact match end
    return {
        originalEnd: endMappings.originalOffset
    };
};

const getOriginalEndPosition = (cache, state) => {

    const { endMappings, originalState } = cache;

    // (end - 1), inclusive
    if (Array.isArray(endMappings)) {
        return getOriginalExclusiveEnd(cache, state);
    }

    // Exact match (end - 1)

    // check end char
    const oi = endMappings.originalOffset;
    const originalEndChar = originalState.locator.getSlice(oi, oi + 1);
    // the char should never end with "{" or "("
    if (['{', '('].includes(originalEndChar)) {
        return getOriginalExclusiveEnd(cache, state);
    }

    // inclusive to exclusive
    return {
        originalEnd: oi + 1
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

const getOriginalState = (start, end, state, originalMap) => {

    const mappingInfo = getMappingInfo(start, end, state);
    if (mappingInfo.error) {
        return mappingInfo;
    }

    const { startMappings, endMappings } = mappingInfo;

    // check source file indexes
    const startIndexes = [].concat(startMappings).map((it) => it.sourceIndex);
    const endIndexes = [].concat(endMappings).map((it) => it.sourceIndex);
    const results = checkSourceFileIndexes(startIndexes, endIndexes);
    if (!results) {
        return {
            error: true,
            errors: [`invalid source indexes: ${EC.yellow(`${startIndexes} ~ ${endIndexes}`)}`]
        };
    }

    const {
        sourceIndex, crossStart, crossEnd
    } = results;

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

    // cache for original info
    return {
        // for debug
        // startIndexes,
        // endIndexes,

        start,
        end,
        startMappings,
        endMappings,

        sourceIndex,
        crossStart,
        crossEnd,
        originalState
    };
};

const getMappingInfo = (start, end, state) => {

    const { decodedMappings } = state;
    // possible no length
    if (decodedMappings.length < 2) {
        return {
            error: true,
            errors: ['invalid decoded mappings (length < 2)']
        };
    }

    // start: inclusive
    const startMappings = findMapping(decodedMappings, start);
    if (!startMappings) {
        return {
            error: true,
            errors: ['not found start mappings']
        };
    }

    // end: exclusive
    const endMappings = findMapping(decodedMappings, end - 1);
    if (!endMappings) {
        return {
            error: true,
            errors: ['not found end mappings']
        };
    }

    // could be 4 mappings found
    return {
        startMappings,
        endMappings
    };
};


const findOriginalRange = (start, end, state, originalMap, options = {}) => {

    const { sourcePath, rangeCache } = state;

    const key = `${start}_${end}_${Boolean(options.fixOriginalRange)}`;
    if (rangeCache.has(key)) {
        return rangeCache.get(key);
    }

    const createMappingError = (errors) => {
        const res = {
            error: true,
            start,
            end,
            sourcePath,
            errors
        };

        // cache error response
        rangeCache.set(key, res);

        return res;
    };

    const cache = getOriginalState(start, end, state, originalMap);
    if (cache.error) {
        return createMappingError(cache.errors);
    }

    const originalStartResult = getOriginalStartPosition(cache, state, options);
    const { originalStart, originalName } = originalStartResult;
    // could be used for end
    cache.originalStart = originalStart;

    const originalEndResult = getOriginalEndPosition(cache, state);
    if (originalEndResult.error) {
        return createMappingError(originalEndResult.errors);
    }
    const { originalEnd } = originalEndResult;

    // range start > end
    if (originalStart > originalEnd) {
        return createMappingError([`invalid original start > end: ${EC.yellow(originalStart)} > ${EC.yellow(originalEnd)}`]);
    }

    const { originalState } = cache;
    const locator = originalState.locator;

    const inComment = locator.lineParser.commentParser.isComment(originalStart, originalEnd);
    if (inComment) {
        return createMappingError(['the range in a original comment']);
    }

    const res = {
        start: originalStart,
        end: originalEnd,
        name: originalName,
        originalState
    };

    if (options.fixOriginalRange) {
        const { fixedStart, fixedEnd } = Util.fixSourceRange(locator, originalStart, originalEnd);
        res.start = fixedStart;
        res.end = fixedEnd;
    }

    // cache response
    rangeCache.set(key, res);

    return res;

};

module.exports = findOriginalRange;
