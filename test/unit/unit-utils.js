import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Creates a fixture directory under os.tmpdir(). A relative specifier cannot
// cross Windows volumes (for example a repository and os.tmpdir() on different
// drives), so fall back to the ignored .temp directory on the cwd volume.
const createTempRoot = (prefix) => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    if (!path.isAbsolute(path.relative(process.cwd(), temp))) {
        return temp;
    }
    fs.rmSync(temp, {
        recursive: true, force: true
    });
    const local = path.join(process.cwd(), '.temp');
    fs.mkdirSync(local, {
        recursive: true
    });
    return fs.mkdtempSync(path.join(local, prefix));
};

export { createTempRoot };
