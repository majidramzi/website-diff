/**
 * Fetch a URL directly with the browser Fetch API (no proxy, no backend).
 * Most websites block cross-origin reads via CORS, in which case this throws
 * a descriptive error so the UI can guide the user to paste/upload instead.
 */
export async function fetchUrlText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors' });
  } catch (err) {
    throw new Error(
      `Could not fetch "${url}" directly from the browser. ` +
        'This is usually caused by CORS: the site does not allow other origins to read its content. ' +
        'No proxy is used by design. Please paste the page HTML or upload a saved copy instead.',
    );
  }
  if (!res.ok) {
    throw new Error(`Request to "${url}" failed with HTTP ${res.status} ${res.statusText}.`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType && !/text|html|xml|json|javascript/i.test(contentType)) {
    throw new Error(`"${url}" returned "${contentType}", which is not text/HTML content.`);
  }
  return await res.text();
}

/**
 * Read a local file as text. Uses File.text() where available and falls back to
 * FileReader (older browsers and some test environments).
 */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
    reader.readAsText(file);
  });
}
