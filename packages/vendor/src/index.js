import * as convertSourceMap from 'convert-source-map';
import axios from 'axios';

import { decode } from '@jridgewell/sourcemap-codec';

import { mergeScriptCovs } from '@bcoe/v8-coverage';

export {

    convertSourceMap,
    axios,

    decode,

    mergeScriptCovs
};
