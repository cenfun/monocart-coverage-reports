import * as convertSourceMap from 'convert-source-map';
import axios from 'axios';

import { decode } from '@jridgewell/sourcemap-codec';

import { mergeScriptCovs } from '@bcoe/v8-coverage';

import * as acornLoose from 'acorn-loose';
import * as acornWalk from 'acorn-walk';

export {

    convertSourceMap,
    axios,

    decode,

    mergeScriptCovs,

    acornLoose,
    acornWalk
};
