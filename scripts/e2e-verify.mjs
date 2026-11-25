/**
 * End-to-end verification in a real headless browser against the production build:
 *   1. file upload of two HTML files,
 *   2. text comparison via the textareas,
 *   3. HTML comparison metadata extraction,
 *   4. TXT / HTML / JSON report downloads.
 *
 * Usage (after `npm run build`):
 *   npm run verify:e2e
 *
 * Requires Playwright + Chromium: `npm i -D playwright && npx playwright install chromium`.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT ?? 4176);
const baseUrl = `http://127.0.0.1:${port}/website-diff/`;
const work = join(tmpdir(), `website-diff-e2e-${Date.now()}`);
mkdirSync(work, { recursive: true });

const fileA = join(work, 'original.html');
const fileB = join(work, 'modified.html');
writeFileSync(
  fileA,
  `<!doctype html><html><head><title>Original Title</title><meta name="description" content="Original description."></head>
<body><h1>Heading</h1><p>Unchanged paragraph.</p><p>Paragraph that changes.</p><a href="/a">Link A</a></body></html>`,
);
writeFileSync(
  fileB,
  `<!doctype html><html><head><title>Modified Title</title><meta name="description" content="Modified description."></head>
<body><h1>Heading</h1><p>Unchanged paragraph.</p><p>Paragraph that changed.</p><a href="/a">Link A</a><a href="/b">Link B</a></body></html>`,
);

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server not reachable at ${url}`);
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore',
});

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 950 } });
  const page = await context.newPage();
  const byText = (selector, text) => page.locator(selector).filter({ hasText: text }).first();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // --- 1. File upload -----------------------------------------------------
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(0).setInputFiles(fileA);
  await fileInputs.nth(1).setInputFiles(fileB);
  await page.waitForFunction(() => document.querySelectorAll('textarea')[0].value.includes('Original Title'));
  check('file upload fills both panels', true, 'original.html + modified.html');

  // --- 2. HTML comparison --------------------------------------------------
  await byText('button', 'Compare versions').click();
  await page.waitForSelector('text=Unchanged lines');
  const bodyText = await page.textContent('body');
  check('HTML mode detected', (await page.locator('button', { hasText: 'HTML content' }).count()) > 0);
  check('summary shows counts', /Added/.test(bodyText ?? '') && /Removed/.test(bodyText ?? ''));

  await byText('button', 'HTML content').click();
  await page.waitForSelector('text=Metadata & selected fields');
  const htmlText = await page.textContent('body');
  check('title change extracted', htmlText?.includes('Original Title') && htmlText?.includes('Modified Title'));
  check('meta description change extracted', htmlText?.includes('Modified description.'));
  check('added link extracted', htmlText?.includes('Link B → /b'));

  // --- 3. Text comparison ---------------------------------------------------
  await page.reload({ waitUntil: 'networkidle' });
  const areas = page.locator('textarea');
  await areas.nth(0).fill('line one\nline two\nline three');
  await areas.nth(1).fill('line one\nline TWO edited\nline three\nline four');
  await page.locator('button', { hasText: 'Text' }).first().click();
  await byText('button', 'Compare versions').click();
  await page.waitForSelector('text=Unchanged lines');
  await byText('button', 'Side-by-side').click();
  await page.waitForSelector('table tbody tr');
  const diffText = await page.textContent('table');
  check('text diff shows modified line', diffText?.includes('line TWO edited') ?? false);
  check('text diff shows added line', diffText?.includes('line four') ?? false);

  // --- 4. Exports -------------------------------------------------------------
  const downloads = [];
  page.on('download', (d) => downloads.push(d));

  async function grab(label, ext) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: label, exact: true }).click(),
    ]);
    check(`${ext} export downloads`, download.suggestedFilename().endsWith(`.${ext}`), download.suggestedFilename());
    const path = await download.path();
    return readFileSync(path, 'utf8');
  }

  const txt = await grab('TXT', 'txt');
  check('TXT report has summary + unified diff', txt.includes('Website Diff — Change Report') && txt.includes('Unified Diff'));

  const html = await grab('HTML', 'html');
  check('HTML report is standalone + escaped', html.startsWith('<!doctype html>') && !html.includes('<script'));

  const json = await grab('JSON', 'json');
  const parsed = JSON.parse(json);
  check('JSON report parses with summary shape', parsed.tool === 'website-diff' && typeof parsed.summary.added === 'number');

  await browser.close();
} catch (err) {
  failures++;
  console.error('E2E ERROR:', err);
} finally {
  preview.kill();
}

console.log(failures === 0 ? '\nALL E2E CHECKS PASSED' : `\n${failures} E2E CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
