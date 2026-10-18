// Keep Acorn external: bundling it can hurt conversion performance (issue #47).
import parseCss from 'postcss/lib/parse';
import diffSequenceModule from 'diff-sequences';

// This CommonJS dependency exposes its function as exports.default.
const diffSequence = diffSequenceModule.default || diffSequenceModule;

export { parseCss, diffSequence };
