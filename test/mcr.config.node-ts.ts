import type { McrCliOptions } from 'monocart-coverage-reports';
import { createNativeTypeScriptOptions } from './node-ts/mcr.config.create.js';

export default createNativeTypeScriptOptions('node-ts') satisfies McrCliOptions;
