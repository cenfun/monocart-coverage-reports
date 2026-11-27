// Generate the social preview with the existing Playwright development dependency.
// Usage: node scripts/og-image/make-og-image.js
// Install Chromium if needed: npx playwright install chromium
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const main = async () => {
    const templateDir = import.meta.dirname;
    const template = await fs.readFile(path.resolve(templateDir, 'og-image.html'), 'utf8');
    const heroArt = await fs.readFile(path.resolve(templateDir, '../../assets/hero-art.svg'));
    const html = template.replace('{placeholder_hero_art}', `data:image/svg+xml;base64,${heroArt.toString('base64')}#static`);
    const outputPath = path.resolve(templateDir, '../../assets/og-image.png');

    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({
            viewport: {
                width: 1200,
                height: 630
            },
            deviceScaleFactor: 1
        });
        await page.setContent(html, {
            waitUntil: 'load'
        });
        await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(Array.from(document.images, (img) => img.decode()));
        });
        await page.screenshot({
            path: outputPath,
            type: 'png'
        });
        console.log(`saved ${outputPath} (1200x630)`);
    } finally {
        await browser.close();
    }
};

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
