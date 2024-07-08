import * as convertSourceMap from 'convert-source-map';

import { decode } from '@jridgewell/sourcemap-codec';

import { mergeScriptCovs } from '@bcoe/v8-coverage';

import parseCss from 'postcss/lib/parse';

import { minimatch } from 'minimatch';

import WebSocket from 'ws';

import diff from 'diff-sequences';

import { findUpSync } from 'find-up';

import supportsColor from 'supports-color';

export {

    convertSourceMap,

    decode,

    mergeScriptCovs,

    parseCss,

    minimatch,
    WebSocket,

    diff,

    findUpSync,

    supportsColor
};
