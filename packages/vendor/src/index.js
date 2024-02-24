import * as convertSourceMap from 'convert-source-map';

import { decode } from '@jridgewell/sourcemap-codec';

import { mergeScriptCovs } from '@bcoe/v8-coverage';

import * as acorn from 'acorn';
import * as acornLoose from 'acorn-loose';
import * as acornWalk from 'acorn-walk';

import parseCss from 'postcss/lib/parse';

import { program } from 'commander';
import { foregroundChild } from 'foreground-child';

import { minimatch } from 'minimatch';

import supportsColor from 'supports-color';

export {

    convertSourceMap,

    decode,

    mergeScriptCovs,

    acorn,
    acornLoose,
    acornWalk,

    parseCss,

    program,
    foregroundChild,

    minimatch,

    supportsColor
};
