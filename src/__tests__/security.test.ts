import { describe, expect, it } from 'vitest';
import { sanitizeHtml, stripTags } from '../lib/sanitize';
import { compareContents } from '../lib/compare';
import { DEFAULT_OPTIONS } from '../lib/types';

describe('sanitizeHtml (DOMPurify)', () => {
  it('removes script elements', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert("xss")</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert');
    expect(out).toContain('<p>ok</p>');
  });

  it('removes inline event handlers', () => {
    const out = sanitizeHtml('<img src="/x.png" onerror="alert(1)" alt="a">');
    expect(out).not.toContain('onerror');
    expect(out).toContain('src="/x.png"');
  });

  it('removes iframes, objects, forms and srcdoc', () => {
    const out = sanitizeHtml('<iframe srcdoc="<script>alert(1)</script>"></iframe><form><input name="a"></form><object data="x"></object>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<form');
    expect(out).not.toContain('<object');
    expect(out).not.toContain('srcdoc');
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).not.toContain('javascript:');
  });

  it('keeps harmless structural markup', () => {
    const out = sanitizeHtml('<h1>Title</h1><ul><li>one</li></ul><a href="/about">About</a>');
    expect(out).toContain('<h1>Title</h1>');
    expect(out).toContain('<li>one</li>');
    expect(out).toContain('href="/about"');
  });

  it('stripTags returns text only', () => {
    expect(stripTags('<div><p>Hello <b>world</b></p><script>evil()</script></div>')).toBe('Hello world');
  });
});

describe('untrusted content handling', () => {
  it('never surfaces script source in comparison output', () => {
    const hostile = '<html><body><p>Text</p><script>document.cookie</script><img src=x onerror="steal()"></body></html>';
    const result = compareContents(hostile, '<html><body><p>Text changed</p></body></html>', DEFAULT_OPTIONS, 'html');
    const json = JSON.stringify(result);
    expect(json).not.toContain('document.cookie');
    expect(json).not.toContain('steal()');
    // The hostile image survives as inert extracted data only.
    expect(result.htmlDiff!.extractA.images).toHaveLength(1);
  });
});
