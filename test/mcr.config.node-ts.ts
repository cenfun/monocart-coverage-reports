import type { McrCliOptions } from 'monocart-coverage-reports';
import { createNativeTypeScriptOptions } from './node-ts/options.js';

export default createNativeTypeScriptOptions('node-ts') satisfies McrCliOptions;
