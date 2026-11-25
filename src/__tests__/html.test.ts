import { describe, expect, it } from 'vitest';
import { compareHtml, extractHtml, looksLikeHtml, parseHtml } from '../lib/html';
import { DEFAULT_OPTIONS, type CompareOptions } from '../lib/types';

const opts: CompareOptions = { ...DEFAULT_OPTIONS };

const A = `<!doctype html><html><head>
<title>Old Title</title>
<meta name="description" content="Old description for the page.">
<meta property="og:title" content="Old Title">
<link rel="canonical" href="https://example.com/old">
</head><body>
<h1>Main heading</h1>
<p>First paragraph stays the same.</p>
<p>Second paragraph will change.</p>
<a href="/about">About us</a>
<a href="/contact">Contact</a>
<img src="/a.png" alt="Image A">
<nav><a href="/old-nav">Nav link</a></nav>
<script>alert('never runs')</script>
</body></html>`;

const B = `<!doctype html><html><head>
<title>New Title</title>
<meta name="description" content="New description for the page.">
<meta property="og:title" content="New Title">
<link rel="canonical" href="https://example.com/new">
</head><body>
<h1>Main heading</h1>
<p>First paragraph stays the same.</p>
<p>Second paragraph did change.</p>
<a href="/about">About us</a>
<a href="/pricing">Pricing</a>
<img src="/b.png" alt="Image B">
<nav><a href="/old-nav">Nav link</a></nav>
<script>alert('never runs')</script>
</body></html>`;

describe('extractHtml', () => {
  it('extracts title, meta description and canonical URL', () => {
    const e = extractHtml(A, opts);
    expect(e.title).toBe('Old Title');
    expect(e.metaDescription).toBe('Old description for the page.');
    expect(e.canonical).toBe('https://example.com/old');
  });

  it('extracts headings with their level, paragraphs, links and images', () => {
    const e = extractHtml(A, opts);
    expect(e.headings).toEqual([{ level: 1, text: 'Main heading' }]);
    expect(e.paragraphs).toHaveLength(2);
    expect(e.links.map((l) => l.href)).toEqual(['/about', '/contact', '/old-nav']);
    expect(e.images).toEqual([{ src: '/a.png', alt: 'Image A' }]);
  });

  it('collects selected metadata into the meta map', () => {
    const e = extractHtml(B, opts);
    expect(e.meta['og:title']).toBe('New Title');
    expect(e.meta['description']).toContain('New description');
  });

  it('never includes script content in the visible text and never executes it', () => {
    const e = extractHtml(A, opts);
    expect(e.text).not.toContain('alert');
    expect(e.text).toContain('First paragraph stays the same.');
    expect(e.normalizedHtml).not.toContain('<script');
  });

  it('returns empty strings instead of throwing for HTML without head metadata', () => {
    const e = extractHtml('<div>just a fragment</div>', opts);
    expect(e.title).toBe('');
    expect(e.metaDescription).toBe('');
    expect(e.canonical).toBe('');
    expect(e.text).toBe('just a fragment');
  });
});

describe('compareHtml — title and meta description', () => {
  it('flags a changed page title as modified', () => {
    const d = compareHtml(A, B, opts);
    const title = d.scalarChanges.find((c) => c.field === 'Title');
    expect(title).toBeDefined();
    expect(title!.status).toBe('modified');
    expect(title!.left).toBe('Old Title');
    expect(title!.right).toBe('New Title');
  });

  it('flags a changed meta description as modified', () => {
    const d = compareHtml(A, B, opts);
    const desc = d.scalarChanges.find((c) => c.field === 'Meta description');
    expect(desc!.status).toBe('modified');
    expect(desc!.right).toContain('New description');
  });

  it('flags a changed canonical URL as modified', () => {
    const d = compareHtml(A, B, opts);
    expect(d.scalarChanges.find((c) => c.field === 'Canonical URL')!.status).toBe('modified');
  });

  it('reports equal when the title is unchanged', () => {
    const d = compareHtml(A, A, opts);
    expect(d.scalarChanges.every((c) => c.status === 'equal')).toBe(true);
    expect(d.added).toBe(0);
    expect(d.removed).toBe(0);
    expect(d.modified).toBe(0);
    expect(d.changePercent).toBe(0);
  });

  it('reports added when a title appears from nothing and removed when it disappears', () => {
    expect(compareHtml('<p>x</p>', '<title>T</title><p>x</p>', opts).scalarChanges.find((c) => c.field === 'Title')!.status).toBe('added');
    expect(compareHtml('<title>T</title><p>x</p>', '<p>x</p>', opts).scalarChanges.find((c) => c.field === 'Title')!.status).toBe('removed');
  });
});

describe('compareHtml — links, headings, paragraphs, images, meta', () => {
  it('detects a swapped link as one removal and one addition', () => {
    const d = compareHtml(A, B, opts);
    const links = d.listChanges.find((c) => c.field === 'Links')!;
    expect(links.added).toEqual(['Pricing → /pricing']);
    expect(links.removed).toEqual(['Contact → /contact']);
    expect(links.equal).toHaveLength(2);
  });

  it('detects an added link without counting it as removed', () => {
    const b2 = B.replace('<a href="/pricing">Pricing</a>', '<a href="/pricing">Pricing</a><a href="/docs">Docs</a>');
    const d = compareHtml(B, b2, opts);
    const links = d.listChanges.find((c) => c.field === 'Links')!;
    expect(links.added).toEqual(['Docs → /docs']);
    expect(links.removed).toHaveLength(0);
  });

  it('detects a changed image src/alt and a changed paragraph', () => {
    const d = compareHtml(A, B, opts);
    const images = d.listChanges.find((c) => c.field === 'Images')!;
    expect(images.added).toEqual(['/b.png (alt: Image B)']);
    expect(images.removed).toEqual(['/a.png (alt: Image A)']);
    const paragraphs = d.listChanges.find((c) => c.field === 'Paragraphs')!;
    expect(paragraphs.added).toEqual(['Second paragraph did change.']);
    expect(paragraphs.removed).toEqual(['Second paragraph will change.']);
  });

  it('detects heading level changes as list changes', () => {
    const d = compareHtml('<h1>Title</h1>', '<h2>Title</h2>', opts);
    const headings = d.listChanges.find((c) => c.field === 'Headings')!;
    expect(headings.added).toEqual(['h2: Title']);
    expect(headings.removed).toEqual(['h1: Title']);
  });

  it('detects changed og: meta tag content', () => {
    const d = compareHtml(A, B, opts);
    const meta = d.listChanges.find((c) => c.field === 'Meta tags')!;
    expect(meta.removed.some((m) => m.startsWith('og:title'))).toBe(true);
    expect(meta.added.some((m) => m.includes('New Title'))).toBe(true);
  });

  it('produces a visible-text diff alongside the metadata diff', () => {
    const d = compareHtml(A, B, opts);
    expect(d.textDiff.rows.some((r) => r.type === 'modified' || r.type === 'added')).toBe(true);
    expect(d.normalizedDiff).not.toBeNull();
    expect(d.normalizedDiff!.unified).toContain('@@');
  });

  it('aggregates totals across metadata and text', () => {
    const d = compareHtml(A, B, opts);
    expect(d.added).toBeGreaterThan(0);
    expect(d.removed).toBeGreaterThan(0);
    expect(d.modified).toBeGreaterThan(0);
    expect(d.changePercent).toBeGreaterThan(0);
  });
});

describe('comparison options', () => {
  it('ignoreAttributes removes attribute noise from the normalized diff', () => {
    const a = '<p class="red" id="x">Hello</p>';
    const b = '<p class="blue" id="y">Hello</p>';
    expect(compareHtml(a, b, { ...opts, ignoreAttributes: false }).normalizedDiff!.unified).toContain('class=');
    const withoutAttrs = compareHtml(a, b, { ...opts, ignoreAttributes: true });
    expect(withoutAttrs.normalizedDiff!.unified).not.toContain('class=');
    expect(withoutAttrs.normalizedDiff!.added).toBe(0);
    expect(withoutAttrs.normalizedDiff!.removed).toBe(0);
  });

  it('ignoreTags drops the selected tags before comparing', () => {
    const a = '<h1>Same</h1><nav><a href="/one">One</a></nav>';
    const b = '<h1>Same</h1><nav><a href="/two">Two</a></nav>';
    expect(compareHtml(a, b, opts).listChanges.find((c) => c.field === 'Links')!.added).toHaveLength(1);
    const ignoringNav = compareHtml(a, b, { ...opts, ignoreTags: ['nav'] });
    expect(ignoringNav.listChanges.find((c) => c.field === 'Links')!.added).toHaveLength(0);
    expect(ignoringNav.listChanges.find((c) => c.field === 'Links')!.removed).toHaveLength(0);
  });

  it('script and style are always ignored even without configuration', () => {
    const a = '<p>x</p><script>var a=1;</script>';
    const b = '<p>x</p><script>var a=2;</script>';
    const d = compareHtml(a, b, { ...opts, ignoreTags: [] });
    expect(d.textDiff.added + d.textDiff.removed + d.textDiff.modified).toBe(0);
    expect(d.normalizedDiff!.added).toBe(0);
  });

  it('textOnly compares visible text and ignores markup differences', () => {
    const a = '<div class="a"><p>Hello world</p></div>';
    const b = '<section class="b"><p>Hello world</p></section>';
    const d = compareHtml(a, b, { ...opts, textOnly: true });
    expect(d.normalizedDiff!.added + d.normalizedDiff!.removed + d.normalizedDiff!.modified).toBe(0);
    expect(d.extractA.normalizedHtml).toBe('Hello world');
  });

  it('normalizedHtml=false skips the markup diff', () => {
    expect(compareHtml(A, B, { ...opts, normalizedHtml: false }).normalizedDiff).toBeNull();
  });

  it('ignoreCase makes metadata comparison case-insensitive', () => {
    const d = compareHtml('<title>Hello</title>', '<title>HELLO</title>', { ...opts, ignoreCase: true });
    expect(d.scalarChanges.find((c) => c.field === 'Title')!.status).toBe('equal');
  });

  it('ignoreWhitespace makes link text comparison whitespace-insensitive', () => {
    const a = '<a href="/x">  Link   text </a>';
    const b = '<a href="/x">Link text</a>';
    const d = compareHtml(a, b, { ...opts, ignoreWhitespace: true });
    const links = d.listChanges.find((c) => c.field === 'Links')!;
    expect(links.added).toHaveLength(0);
    expect(links.removed).toHaveLength(0);
  });
});

describe('malformed and hostile HTML', () => {
  it('parses unclosed tags, unquoted attributes and a missing </head> without throwing', () => {
    // Deliberately broken markup: unclosed <meta>, no </head>, unclosed <p>/<li>/<a>/<img>,
    // an unquoted attribute value and no closing </html>.
    const broken =
      '<html><head><title>Broken Page</title><meta name="description" content="desc"><body>' +
      '<h1>Heading<p>Paragraph<ul><li>One<li>Two<a href=/x>Link<img src="/i.png">';
    const e = extractHtml(broken, opts);
    expect(e.title).toBe('Broken Page');
    expect(e.metaDescription).toBe('desc');
    expect(e.headings[0].level).toBe(1);
    expect(e.headings[0].text.startsWith('Heading')).toBe(true);
    expect(e.paragraphs.some((p) => p.startsWith('Paragraph'))).toBe(true);
    expect(e.links).toEqual([{ text: 'Link', href: '/x' }]);
    expect(e.images).toEqual([{ src: '/i.png', alt: '' }]);
    expect(e.text).toContain('Paragraph');
  });

  it('treats an unclosed <title> the way the HTML spec does (RCDATA swallows the rest)', () => {
    // Per the HTML tokenizer, only </title> ends a title element — browsers and
    // DOMParser agree. Extraction must not throw or lose the leading text.
    const e = extractHtml('<html><head><title>Broken Page<body><h1>Heading', opts);
    expect(e.title.startsWith('Broken Page')).toBe(true);
    expect(e.headings).toHaveLength(0);
  });

  it('compares two malformed documents and still reports differences', () => {
    const d = compareHtml('<div><p>unclosed', '<div><p>unclosed and changed', opts);
    expect(d.textDiff.rows.some((r) => r.type !== 'equal')).toBe(true);
  });

  it('handles completely empty inputs', () => {
    const d = compareHtml('', '', opts);
    expect(d.scalarChanges.map((c) => c.status)).toEqual(['equal', 'equal', 'equal']);
    expect(d.added).toBe(0);
  });

  it('recovers from stray closing tags and unquoted attributes', () => {
    const e = parseHtml('<p class=foo>text</p></div></span>');
    expect(e.querySelector('p')?.getAttribute('class')).toBe('foo');
  });
});

describe('looksLikeHtml', () => {
  it('detects HTML documents and fragments', () => {
    expect(looksLikeHtml('<!doctype html><html></html>')).toBe(true);
    expect(looksLikeHtml('  <div>hello</div>')).toBe(true);
    expect(looksLikeHtml('<h2>Title</h2>')).toBe(true);
  });

  it('rejects plain text', () => {
    expect(looksLikeHtml('Just some plain text about <things>')).toBe(false);
    expect(looksLikeHtml('Line one\nLine two')).toBe(false);
    expect(looksLikeHtml('')).toBe(false);
  });
});
