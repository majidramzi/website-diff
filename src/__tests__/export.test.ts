import { describe, expect, it } from 'vitest';
import { compareContents } from '../lib/compare';
import { buildHtmlReport, buildJsonReport, buildTextReport } from '../lib/export';
import { DEFAULT_OPTIONS } from '../lib/types';

const meta = { labelA: 'original.html', labelB: 'modified.html', urlA: 'https://a.example/', urlB: undefined };

const textA = 'Hero headline: Old\nSub: same\nCTA: Start free trial';
const textB = 'Hero headline: New\nSub: same\nCTA: Start free trial\nFooter: added line';

const htmlA = `<!doctype html><html><head><title>Old</title><meta name="description" content="Old desc"></head>
<body><h1>Heading</h1><p>Para one</p><a href="/a">A</a></body></html>`;
const htmlB = `<!doctype html><html><head><title>New</title><meta name="description" content="New desc"></head>
<body><h1>Heading</h1><p>Para two</p><a href="/a">A</a><a href="/b">B</a></body></html>`;

describe('buildTextReport', () => {
  it('includes summary counts, labels and the unified diff', () => {
    const result = compareContents(textA, textB, DEFAULT_OPTIONS, 'text');
    const report = buildTextReport(result, meta);
    expect(report).toContain('Website Diff — Change Report');
    expect(report).toContain('Original:  original.html');
    expect(report).toContain('Added:');
    expect(report).toContain('Removed:');
    expect(report).toContain('Modified:');
    expect(report).toContain('Change:');
    expect(report).toContain('Unified Diff');
    expect(report).toContain('-CTA: Start free trial');
    expect(report).toContain('+Footer: added line');
  });

  it('includes HTML metadata and content-list sections in HTML mode', () => {
    const result = compareContents(htmlA, htmlB, DEFAULT_OPTIONS, 'html');
    const report = buildTextReport(result, meta);
    expect(report).toContain('Mode:      HTML comparison');
    expect(report).toContain('HTML Metadata');
    expect(report).toContain('[MODIFIED] Title');
    expect(report).toContain('Original: Old');
    expect(report).toContain('Modified: New');
    expect(report).toContain('HTML Content Lists');
    expect(report).toContain('Links: +1 / -0');
    expect(report).toContain('+ B → /b');
    expect(report).toContain('Paragraphs: +1 / -1');
  });

  it('contains no script tags even when the source did', () => {
    const result = compareContents('<p>a</p><script>alert(1)</script>', '<p>b</p>', DEFAULT_OPTIONS, 'html');
    expect(buildTextReport(result, meta)).not.toContain('alert(1)');
  });
});

describe('buildHtmlReport', () => {
  it('produces a standalone document with summary, table rows and escaped content', () => {
    const result = compareContents(htmlA, htmlB, DEFAULT_OPTIONS, 'html');
    const report = buildHtmlReport(result, meta);
    expect(report.startsWith('<!doctype html>')).toBe(true);
    expect(report).toContain('<title>Website Diff Report</title>');
    expect(report).toContain('HTML Metadata');
    expect(report).toContain('Side-by-Side Diff');
    expect(report).toContain('Unified Diff');
    expect(report).toContain('<style>');
    expect(report).not.toContain('<script');
  });

  it('escapes HTML-special characters from user content', () => {
    const result = compareContents('<p><script>alert("xss")</script></p>', '<p>safe &amp; sound</p>', DEFAULT_OPTIONS, 'text');
    const report = buildHtmlReport(result, meta);
    expect(report).not.toContain('<script>alert("xss")</script>');
    expect(report).toContain('&lt;script&gt;alert(&quot;xss&quot;)');
  });

  it('colors added, removed and modified rows', () => {
    const result = compareContents('kept\nremoved line\nmodified old', 'kept\nmodified new\nadded line', DEFAULT_OPTIONS, 'text');
    const report = buildHtmlReport(result, meta);
    expect(report).toContain('class="mod"');
    expect(report).toContain('class="add"');
    expect(report).toContain('class="del"');
    expect(report).toContain('class="eq"');
  });
});

describe('buildJsonReport', () => {
  it('emits valid JSON with the documented shape', () => {
    const result = compareContents(htmlA, htmlB, DEFAULT_OPTIONS, 'html');
    const parsed = JSON.parse(buildJsonReport(result, meta)) as Record<string, unknown>;
    expect(parsed.tool).toBe('website-diff');
    expect(parsed.mode).toBe('html');
    expect(parsed.original).toEqual({ label: 'original.html', url: 'https://a.example/' });
    expect(parsed.modified).toEqual({ label: 'modified.html', url: null });
    const summary = parsed.summary as Record<string, number>;
    expect(summary.added).toBeGreaterThan(0);
    expect(summary.removed).toBeGreaterThan(0);
    expect(summary.modified).toBeGreaterThan(0);
    expect(typeof summary.changePercent).toBe('number');
    const html = parsed.html as { scalarChanges: Array<{ field: string; status: string }> };
    expect(html.scalarChanges.map((c) => c.field)).toEqual(['Title', 'Meta description', 'Canonical URL']);
    expect(Array.isArray(parsed.rows)).toBe(true);
    expect(typeof parsed.unifiedDiff).toBe('string');
  });

  it('sets html to null in text mode', () => {
    const result = compareContents(textA, textB, DEFAULT_OPTIONS, 'text');
    expect(JSON.parse(buildJsonReport(result, meta)).html).toBeNull();
  });
});
