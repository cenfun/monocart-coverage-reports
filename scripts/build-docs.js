import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vitepress';

const projectDir = fileURLToPath(new URL('../', import.meta.url));

// VitePress 1.x does not expose its SSR temp directory in the user config.
// Keep that intermediate output outside the tracked documentation source too.
await build(path.join(projectDir, 'docs'), {
    onAfterConfigResolve(config) {
        config.tempDir = path.join(projectDir, '.temp/vitepress-ssr');
    }
});
await fs.copyFile(path.join(projectDir, 'assets/og-image.png'), path.join(projectDir, '.temp/site/og-image.png'));
