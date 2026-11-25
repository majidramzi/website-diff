import DOMPurify from 'dompurify';

/**
 * Sanitize HTML before it is ever rendered in the interface. All imported
 * content is treated as untrusted. We additionally forbid scripts/iframes and
 * event-handler attributes via the returned config.
 *
 * The UI itself never uses `dangerouslySetInnerHTML` with imported content —
 * this helper exists for the "Sanitized HTML preview" panel and for
 * copy-safe snippets.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'srcdoc'],
    ADD_ATTR: ['target'],
  });
}

/** Strip all tags and return visible text only (never rendered as HTML). */
export function stripTags(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  return (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
}
