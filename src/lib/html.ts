import type {
  CompareOptions,
  FieldChange,
  HtmlDiffResult,
  HtmlExtract,
  ListChange,
} from './types';
import { computeTextDiff } from './diff';
import { normalizeLine } from './normalize';

/**
 * Parse HTML with DOMParser. DOMParser never executes scripts, so imported
 * content stays inert. Malformed HTML is tolerated (browser parser recovery).
 */
export function parseHtml(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/** Heuristic: does this string look like an HTML document/fragment? */
export function looksLikeHtml(text: string): boolean {
  const t = text.trimStart();
  if (!t.startsWith('<')) return false;
  return /<\s*(?:!doctype|html|head|body|title|meta|link|div|span|p|a|h[1-6]|ul|ol|li|table|section|article|header|footer|nav|main|img|script|style|form|button|input|select|textarea|pre|code|blockquote|figure|figcaption|video|audio|iframe|svg|canvas|strong|em|small|br|hr)\b/i.test(t);
}

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Build a working copy of the document with ignored tags removed. */
function filterDocument(doc: Document, opts: CompareOptions): Document {
  const clone = doc.cloneNode(true) as Document;
  // script/style are always removed: they never execute and are noise.
  const ignored = new Set(opts.ignoreTags.map((t) => t.toLowerCase()));
  ignored.add('script');
  ignored.add('style');
  for (const tag of ignored) {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  }
  return clone;
}

/** Build a normalized HTML serialization honoring comparison options. */
function buildNormalizedHtml(doc: Document, opts: CompareOptions): string {
  const clone = doc.cloneNode(true) as Document;

  // Strip attributes when requested (keeps structure + text only).
  if (opts.ignoreAttributes) {
    clone.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    });
  } else {
    // Hardening: normalized markup may be re-embedded in exported reports, so
    // drop event handlers and script-pseudo URLs from untrusted input.
    clone.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value.replace(/\s+/g, '').toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc') el.removeAttribute(attr.name);
        else if ((name === 'href' || name === 'src' || name === 'action' || name === 'data') && value.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      }
    });
  }

  if (opts.textOnly) {
    return visibleText(clone);
  }

  let html = clone.documentElement?.outerHTML ?? '';
  if (opts.ignoreWhitespace) {
    html = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
  }
  return html;
}

function visibleText(doc: Document): string {
  const body = doc.body;
  if (!body) return (doc.documentElement?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const clone = body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  return (clone.textContent ?? '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/**
 * Extract comparable content from an HTML string.
 * The document is parsed with DOMParser (inert — scripts never execute) and
 * ignored tags are removed before anything is read.
 */
export function extractHtml(html: string, opts: CompareOptions): HtmlExtract {
  const doc = filterDocument(parseHtml(html), opts);

  const title = (doc.title ?? '').trim();
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() ?? '';

  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((el) => ({
    level: Number(el.tagName[1]),
    text: textOf(el),
  }));

  const paragraphs = Array.from(doc.querySelectorAll('p')).map((el) => textOf(el)).filter(Boolean);

  const links = Array.from(doc.querySelectorAll('a[href]')).map((el) => ({
    text: textOf(el),
    href: el.getAttribute('href') ?? '',
  }));

  const images = Array.from(doc.querySelectorAll('img')).map((el) => ({
    src: el.getAttribute('src') ?? '',
    alt: el.getAttribute('alt') ?? '',
  }));

  const meta: Record<string, string> = {};
  doc.querySelectorAll('meta[name], meta[property]').forEach((el) => {
    const key = el.getAttribute('name') ?? el.getAttribute('property') ?? '';
    const content = el.getAttribute('content') ?? '';
    if (key) meta[key] = content;
  });

  return {
    title,
    metaDescription,
    canonical,
    headings,
    paragraphs,
    links,
    images,
    meta,
    text: visibleText(doc),
    normalizedHtml: buildNormalizedHtml(doc, opts),
  };
}

function normKey(s: string, opts: CompareOptions): string {
  return normalizeLine(s, opts);
}

/** Multiset-aware list comparison using normalized keys. */
export function compareStringLists(aList: string[], bList: string[], opts: CompareOptions): { added: string[]; removed: string[]; equal: string[] } {
  const bPool = new Map<string, string[]>();
  for (const item of bList) {
    const k = normKey(item, opts);
    const arr = bPool.get(k) ?? [];
    arr.push(item);
    bPool.set(k, arr);
  }
  const equal: string[] = [];
  const removed: string[] = [];
  for (const item of aList) {
    const k = normKey(item, opts);
    const pool = bPool.get(k);
    if (pool && pool.length > 0) {
      equal.push(item);
      pool.shift();
    } else {
      removed.push(item);
    }
  }
  const added: string[] = [];
  for (const arr of bPool.values()) added.push(...arr);
  return { added, removed, equal };
}

function scalarStatus(left: string, right: string, opts: CompareOptions): FieldChange['status'] {
  const l = normKey(left, opts);
  const r = normKey(right, opts);
  if (l === r) return 'equal';
  if (left.trim() === '' && right.trim() !== '') return 'added';
  if (left.trim() !== '' && right.trim() === '') return 'removed';
  return 'modified';
}

function scalar(field: string, left: string, right: string, opts: CompareOptions): FieldChange {
  return { field, left, right, status: scalarStatus(left, right, opts) };
}

/** Full HTML comparison: metadata scalars, content lists, visible text, normalized HTML. */
export function compareHtml(a: string, b: string, opts: CompareOptions): HtmlDiffResult {
  const extractA = extractHtml(a, opts);
  const extractB = extractHtml(b, opts);

  const scalarChanges: FieldChange[] = [
    scalar('Title', extractA.title, extractB.title, opts),
    scalar('Meta description', extractA.metaDescription, extractB.metaDescription, opts),
    scalar('Canonical URL', extractA.canonical, extractB.canonical, opts),
  ];

  const listChanges: ListChange[] = [
    {
      field: 'Headings',
      ...compareStringLists(
        extractA.headings.map((h) => `h${h.level}: ${h.text}`),
        extractB.headings.map((h) => `h${h.level}: ${h.text}`),
        opts,
      ),
    },
    { field: 'Paragraphs', ...compareStringLists(extractA.paragraphs, extractB.paragraphs, opts) },
    {
      field: 'Links',
      ...compareStringLists(
        extractA.links.map((l) => `${l.text} → ${l.href}`),
        extractB.links.map((l) => `${l.text} → ${l.href}`),
        opts,
      ),
    },
    {
      field: 'Images',
      ...compareStringLists(
        extractA.images.map((im) => `${im.src} (alt: ${im.alt})`),
        extractB.images.map((im) => `${im.src} (alt: ${im.alt})`),
        opts,
      ),
    },
    {
      field: 'Meta tags',
      ...compareStringLists(
        Object.entries(extractA.meta).map(([k, v]) => `${k}: ${v}`),
        Object.entries(extractB.meta).map(([k, v]) => `${k}: ${v}`),
        opts,
      ),
    },
  ];

  const textDiff = computeTextDiff(extractA.text, extractB.text, opts);
  const normalizedDiff = opts.normalizedHtml ? computeTextDiff(extractA.normalizedHtml, extractB.normalizedHtml, opts) : null;

  const listAdded = listChanges.reduce((n, c) => n + c.added.length, 0);
  const listRemoved = listChanges.reduce((n, c) => n + c.removed.length, 0);
  const scalarModified = scalarChanges.filter((c) => c.status === 'modified').length;
  const scalarAdded = scalarChanges.filter((c) => c.status === 'added').length;
  const scalarRemoved = scalarChanges.filter((c) => c.status === 'removed').length;

  const added = textDiff.added + listAdded + scalarAdded;
  const removed = textDiff.removed + listRemoved + scalarRemoved;
  const modified = textDiff.modified + scalarModified;
  const changePercent = textDiff.changePercent;

  return { extractA, extractB, scalarChanges, listChanges, textDiff, normalizedDiff, added, removed, modified, changePercent };
}
