import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchUrlText, readFileText } from '../lib/fetchUrl';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockFetch(impl: typeof fetch) {
  vi.stubGlobal('fetch', impl);
}

describe('fetchUrlText', () => {
  it('returns the body text on a successful CORS-enabled response', async () => {
    mockFetch(
      vi.fn(async () =>
        new Response('<html><body>ok</body></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
      ) as unknown as typeof fetch,
    );
    expect(await fetchUrlText('https://cors-friendly.example/page')).toContain('ok');
  });

  it('explains CORS when the browser blocks the request', async () => {
    mockFetch(vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch);

    await expect(fetchUrlText('https://blocked.example/')).rejects.toThrow(/CORS/);
    await expect(fetchUrlText('https://blocked.example/')).rejects.toThrow(/paste the page HTML or upload a saved copy/);
  });

  it('reports HTTP error statuses', async () => {
    mockFetch(vi.fn(async () => new Response('nope', { status: 404, statusText: 'Not Found' })) as unknown as typeof fetch);
    await expect(fetchUrlText('https://example.com/missing')).rejects.toThrow(/404/);
  });

  it('rejects non-text content types', async () => {
    mockFetch(
      vi.fn(async () => new Response('binary', { status: 200, headers: { 'content-type': 'application/pdf' } })) as unknown as typeof fetch,
    );
    await expect(fetchUrlText('https://example.com/file.pdf')).rejects.toThrow(/not text\/HTML/);
  });

  it('requests the URL in cors mode (no proxy is ever used)', async () => {
    const spy = vi.fn(async () => new Response('hi', { status: 200, headers: { 'content-type': 'text/plain' } }));
    mockFetch(spy as unknown as typeof fetch);
    await fetchUrlText('https://example.com/x');
    expect(spy).toHaveBeenCalledWith('https://example.com/x', { mode: 'cors' });
  });
});

describe('readFileText', () => {
  it('reads a local File as text', async () => {
    const file = new File(['<h1>Local page</h1>'], 'page.html', { type: 'text/html' });
    expect(await readFileText(file)).toBe('<h1>Local page</h1>');
  });
});
