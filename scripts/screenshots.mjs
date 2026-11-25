/**
 * Generate the README screenshots with a real headless browser.
 *
 * Usage:
 *   npm run build
 *   npm run screenshots
 *
 * Requires Playwright + a Chromium build:
 *   npm i -D playwright && npx playwright install chromium
 *
 * Starts `vite preview` (production build, GitHub Pages base path), drives the
 * UI exactly like a user would, and writes PNGs into docs/screenshots/.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'docs/screenshots');
const port = Number(process.env.SCREENSHOT_PORT ?? 4173);
const baseUrl = process.env.SCREENSHOT_URL ?? `http://localhost:${port}/website-diff/`;

mkdirSync(outDir, { recursive: true });

/** Wait until the preview server answers. */
async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

async function main() {
  let preview = null;
  if (!process.env.SCREENSHOT_URL) {
    preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1'], {
      cwd: root,
      stdio: 'ignore',
    });
    await waitForServer(baseUrl);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

  const byText = (selector, text) =>
    page.locator(selector).filter({ hasText: text }).first();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Sticky headers float in the middle of full-page captures; pin it for shots.
  await page.addStyleTag({ content: 'header{position:static !important;}' });

  // 1. Empty state (light theme)
  await page.screenshot({ path: resolve(outDir, '01-empty-state.png'), fullPage: false });

  // 2. Load the bundled sample and compare
  await byText('button', 'Load sample').click();
  await byText('button', 'Compare versions').click();
  await page.waitForSelector('text=Unchanged lines');
  await page.screenshot({ path: resolve(outDir, '02-summary.png'), fullPage: true });

  // 3. Side-by-side diff
  await byText('button', 'Side-by-side').click();
  await page.waitForSelector('table tbody tr');
  await page.screenshot({ path: resolve(outDir, '03-side-by-side.png'), fullPage: true });

  // 4. HTML content extraction (metadata + lists)
  await byText('button', 'HTML content').click();
  await page.waitForSelector('text=Metadata & selected fields');
  await page.screenshot({ path: resolve(outDir, '04-html-content.png'), fullPage: true });

  // 5. Unified diff
  await byText('button', 'Unified diff').click();
  await page.waitForSelector('pre');
  await page.screenshot({ path: resolve(outDir, '05-unified-diff.png'), fullPage: true });

  // 6. Normalized HTML diff
  await byText('button', 'Normalized HTML').click();
  await page.waitForSelector('pre');
  await page.screenshot({ path: resolve(outDir, '06-normalized-html.png'), fullPage: true });

  // 7. Sanitized preview (security)
  await byText('button', 'Sanitized preview').click();
  await page.waitForSelector('[data-sanitized]');
  await page.screenshot({ path: resolve(outDir, '07-sanitized-preview.png'), fullPage: true });

  // 8. Dark theme
  await page.locator('button[aria-label="Toggle theme"]').click();
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await byText('button', 'Summary').click();
  await page.waitForSelector('text=Unchanged lines');
  await page.screenshot({ path: resolve(outDir, '08-dark-theme.png'), fullPage: true });

  // 9. Plain-text comparison + settings
  await page.reload({ waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'header{position:static !important;}' });
  const areas = page.locator('textarea');
  await areas.nth(0).fill(
    [
      'Pricing page copy — v1',
      'Headline: Simple, transparent pricing',
      'Sub: Start free, upgrade when you grow',
      'Starter: $19 per month',
      'Pro: $49 per month',
      'CTA: Start free trial',
    ].join('\n'),
  );
  await areas.nth(1).fill(
    [
      'Pricing page copy — v2',
      'Headline: Simple, transparent pricing',
      'Sub: Start free, upgrade whenever you grow',
      'Starter: $29 per month',
      'Business: $99 per month',
      'CTA: Start your 14-day free trial',
      'Note: All prices exclude VAT',
    ].join('\n'),
  );
  await page.locator('label', { hasText: 'Ignore case' }).locator('input').check();
  await byText('button', 'Compare versions').click();
  await page.waitForSelector('text=Unchanged lines');
  await byText('button', 'Side-by-side').click();
  await page.waitForSelector('table tbody tr');
  await page.screenshot({ path: resolve(outDir, '09-text-comparison-dark.png'), fullPage: true });

  // 10. Mobile / responsive layout
  await page.locator('button[aria-label="Toggle theme"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await byText('button', 'Summary').click();
  await page.waitForSelector('text=Unchanged lines');
  await page.screenshot({ path: resolve(outDir, '10-responsive-mobile.png'), fullPage: true });

  await browser.close();
  if (preview) preview.kill();
  console.log(`Screenshots written to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
