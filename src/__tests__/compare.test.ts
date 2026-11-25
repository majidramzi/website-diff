import { describe, expect, it } from 'vitest';
import { compareContents } from '../lib/compare';
import { DEFAULT_OPTIONS } from '../lib/types';
import { SAMPLE_A, SAMPLE_B, SAMPLE_TEXT_A, SAMPLE_TEXT_B } from '../lib/samples';

describe('compareContents — mode resolution', () => {
  it('auto-detects HTML mode for markup input', () => {
    const r = compareContents(SAMPLE_A, SAMPLE_B, DEFAULT_OPTIONS, 'auto');
    expect(r.mode).toBe('html');
    expect(r.htmlDiff).not.toBeNull();
    expect(r.htmlDiff!.scalarChanges.find((c) => c.field === 'Title')!.status).toBe('modified');
  });

  it('auto-detects text mode for plain input', () => {
    const r = compareContents(SAMPLE_TEXT_A, SAMPLE_TEXT_B, DEFAULT_OPTIONS, 'auto');
    expect(r.mode).toBe('text');
    expect(r.htmlDiff).toBeNull();
    expect(r.modified).toBeGreaterThan(0);
    expect(r.added).toBe(1); // the new "Support:" line
  });

  it('honors an explicit text mode even for HTML input', () => {
    const r = compareContents(SAMPLE_A, SAMPLE_B, DEFAULT_OPTIONS, 'text');
    expect(r.mode).toBe('text');
    expect(r.htmlDiff).toBeNull();
    expect(r.textDiff.rows.length).toBeGreaterThan(0);
  });

  it('falls back to text mode when HTML mode finds no structure', () => {
    const r = compareContents('plain line one', 'plain line two', DEFAULT_OPTIONS, 'html');
    expect(r.mode).toBe('text');
    expect(r.htmlDiff).toBeNull();
    expect(r.modified).toBe(1);
  });
});

describe('compareContents — sample page regression', () => {
  it('reports the expected title, description and canonical changes', () => {
    const r = compareContents(SAMPLE_A, SAMPLE_B, DEFAULT_OPTIONS, 'html');
    const byField = Object.fromEntries(r.htmlDiff!.scalarChanges.map((c) => [c.field, c]));
    expect(byField['Title'].right).toBe('Acme Analytics — Real-Time Website Intelligence');
    expect(byField['Meta description'].right).toContain('Core Web Vitals');
    expect(byField['Canonical URL'].right).toBe('https://acme.example.com/home');
  });

  it('reports added nav/footer links, added list items and changed image', () => {
    const r = compareContents(SAMPLE_A, SAMPLE_B, DEFAULT_OPTIONS, 'html');
    const links = r.htmlDiff!.listChanges.find((c) => c.field === 'Links')!;
    expect(links.added.some((l) => l.includes('/docs'))).toBe(true);
    expect(links.added.some((l) => l.includes('/terms'))).toBe(true);
    const images = r.htmlDiff!.listChanges.find((c) => c.field === 'Images')!;
    expect(images.added[0]).toContain('hero-dashboard-v2.png');
    expect(images.removed[0]).toContain('hero-dashboard.png');
  });

  it('reports zero changes when comparing a page with itself', () => {
    const r = compareContents(SAMPLE_A, SAMPLE_A, DEFAULT_OPTIONS, 'html');
    expect(r.added).toBe(0);
    expect(r.removed).toBe(0);
    expect(r.modified).toBe(0);
    expect(r.changePercent).toBe(0);
  });

  it('includes an ISO timestamp for report filenames', () => {
    expect(compareContents('a', 'b', DEFAULT_OPTIONS, 'text').generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('compareContents — options pass-through', () => {
  it('ignoreWhitespace hides indentation-only changes', () => {
    const a = '<div>\n  <p>Hello</p>\n</div>';
    const b = '<div>\n      <p>Hello</p>\n</div>';
    expect(compareContents(a, b, { ...DEFAULT_OPTIONS, ignoreWhitespace: false }, 'text').modified).toBeGreaterThan(0);
    expect(compareContents(a, b, { ...DEFAULT_OPTIONS, ignoreWhitespace: true }, 'text').modified).toBe(0);
  });

  it('ignoreCase hides case-only changes', () => {
    const r = compareContents('Hello World', 'hello world', { ...DEFAULT_OPTIONS, ignoreCase: true }, 'text');
    expect(r.modified).toBe(0);
    expect(r.changePercent).toBe(0);
  });
});
