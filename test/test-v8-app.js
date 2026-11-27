import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { MCR } from '../lib/index.js';

const createReport = async (t) => {
    await fs.mkdir('.temp', {
        recursive: true
    });
    const outputDir = await fs.mkdtemp(path.resolve('.temp/v8-app-'));
    t.after(() => fs.rm(outputDir, {
        recursive: true, force: true
    }));

    // Use an inline report so the app under test comes from the current build,
    // not from the shared assets of an earlier coverage report.
    const coverage = MCR({
        outputDir,
        reports: ['v8'],
        inline: true
    });
    const source = 'globalThis.answer = () => 42;\n';
    await coverage.add([{
        url: 'https://mcr.test/fixture.js',
        source,
        functions: [{
            functionName: '',
            isBlockCoverage: true,
            ranges: [{
                startOffset: 0,
                endOffset: source.length,
                count: 1
            }]
        }]
    }]);
    const result = await coverage.generate();
    assert.ok(result?.reportPath, 'an inline V8 report was generated');
    return fs.readFile(result.reportPath, 'utf8');
};

test('closing an embedded V8 detail preserves page scroll and resets the cursor', async (t) => {
    const html = await createReport(t);

    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({
        viewport: {
            width: 1440, height: 1000
        }
    });
    page.setDefaultTimeout(5000);
    // Use a scrollable same-origin parent without depending on the docs site.
    await page.route('https://mcr.test/', (route) => route.fulfill({
        contentType: 'text/html',
        body: '<main style="padding-block: 600px"><iframe name="report" src="/report.html" style="display:block;width:100%;height:520px;border:0"></iframe></main>'
    }));
    await page.route('https://mcr.test/report.html', (route) => route.fulfill({
        contentType: 'text/html', body: html
    }));
    await page.goto('https://mcr.test/');
    await page.evaluate(() => window.scrollTo(0, 400));
    const frame = page.frame({
        name: 'report'
    });
    assert.ok(frame, 'report iframe loaded');

    const file = frame.getByText('fixture.js', {
        exact: true
    });
    const flyover = frame.locator('.mcr-flyover-header');
    const cursor = frame.locator('.mcr-cursor-foot');
    await file.click();
    await frame.locator('.mcr-report-code .cm-line').first().click();
    await cursor.waitFor();

    // Empty-fragment navigation used to scroll the parent to the iframe's top.
    const frameBox = await page.locator('iframe[name="report"]').boundingBox();
    assert.ok(frameBox?.y > 0, 'the iframe starts below the viewport top');
    const initialScroll = await page.evaluate(() => window.scrollY);
    await flyover.locator(':scope > :last-child').click();
    await frame.waitForFunction(() => !window.location.hash);
    assert.equal(await page.evaluate(() => window.scrollY), initialScroll);

    // Updating history without fragment navigation does not fire popstate.
    // Verify that reopening the same file still clears the previous cursor.
    await file.click();
    await flyover.waitFor();
    await cursor.waitFor({
        state: 'detached'
    });
});

test('V8 report switches themes, remembers the choice, and reacts to system changes', async (t) => {
    const html = await createReport(t);
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({
        colorScheme: 'dark',
        viewport: {
            width: 1440, height: 1000
        }
    });
    page.setDefaultTimeout(5000);
    await page.route('https://mcr.test/report.html', (route) => route.fulfill({
        contentType: 'text/html', body: html
    }));
    await page.goto('https://mcr.test/report.html');

    const themeButton = page.getByRole('button', {
        name: 'Dark mode'
    });
    const waitForTheme = (dark) => {
        const root = dark ? 'html.mcr-dark' : 'html:not(.mcr-dark)';
        const grid = dark ? '.tg-turbogrid.tg-dark' : '.tg-turbogrid:not(.tg-dark)';
        return page.locator(`${root} ${grid}`).waitFor({
            state: 'attached'
        });
    };

    await waitForTheme(true);
    assert.equal(await themeButton.getAttribute('aria-pressed'), 'true');
    await themeButton.press('Enter');
    await waitForTheme(false);
    assert.equal(await themeButton.getAttribute('aria-pressed'), 'false');

    // Rebuilding the grid after a setting change must keep the new theme.
    await page.getByText('Group', {
        exact: true
    }).click();
    await page.getByText('mcr.test', {
        exact: true
    }).waitFor({
        state: 'detached'
    });
    await waitForTheme(false);

    const savedTheme = () => page.evaluate(() => localStorage.getItem('mcr-theme'));
    assert.equal(await savedTheme(), 'light', 'the manual theme was saved before reload');
    await page.reload();
    assert.equal(await savedTheme(), 'light', 'the manual theme survived reload');
    await waitForTheme(false);

    await page.getByText('mcr.test/fixture.js', {
        exact: true
    }).click();
    const editor = page.locator('.mcr-report-code .cm-editor');
    await editor.waitFor();
    assert.equal(await editor.evaluate((el) => getComputedStyle(el).filter), 'none');

    // An OS theme change clears the saved override and updates an open source view.
    await page.emulateMedia({
        colorScheme: 'light'
    });
    await page.waitForFunction(() => localStorage.getItem('mcr-theme') === null);
    await page.emulateMedia({
        colorScheme: 'dark'
    });
    await waitForTheme(true);
    assert.notEqual(await editor.evaluate((el) => getComputedStyle(el).filter), 'none');
    assert.match(await editor.innerText(), /globalThis\.answer/);
});
