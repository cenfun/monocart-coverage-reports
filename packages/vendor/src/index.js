/**
 * there is performance issue if adding acorn: https://github.com/cenfun/monocart-coverage-reports/issues/47
 *
 */

import * as convertSourceMap from 'convert-source-map';

import { decode } from '@jridgewell/sourcemap-codec';

import { mergeScriptCovs } from '@bcoe/v8-coverage';

import parseCss from 'postcss/lib/parse';

import WebSocket from 'ws';

import { minimatch } from 'minimatch';

import diffSequence from 'diff-sequences';

import { findUpSync } from 'find-up';

import { ZipFile } from 'yazl';
import { async as StreamZip } from 'node-stream-zip';

import supportsColor from 'supports-color';

export {

    convertSourceMap,

    decode,

    mergeScriptCovs,

    parseCss,

    WebSocket,

    minimatch,

    diffSequence,

    findUpSync,

    ZipFile,
    StreamZip,

    supportsColor
};
