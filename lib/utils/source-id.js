import { createHash } from 'node:crypto';

const calculateSha1 = (input) => createHash('sha1').update(input).digest('hex');

// Maps belong to collection contexts. Their cache references must not change
// the existing path/content ID used by report files.
const calculateSourceCacheId = (id, sourceMap) => (sourceMap ? `${id}-${calculateSha1(JSON.stringify(sourceMap))}` : id);

export { calculateSha1, calculateSourceCacheId };
