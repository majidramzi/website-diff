import type { CompareResult, InputMeta } from './types';
import { escapeHtml } from './normalize';

/** Human-readable plain-text change report. */
export function buildTextReport(result: CompareResult, meta: InputMeta): string {
  const lines: string[] = [];
  lines.push('Website Diff — Change Report');
  lines.push('='.repeat(60));
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Original:  ${meta.labelA}${meta.urlA ? ` (${meta.urlA})` : ''}`);
  lines.push(`Modified:  ${meta.labelB}${meta.urlB ? ` (${meta.urlB})` : ''}`);
  lines.push(`Mode:      ${result.mode === 'html' ? 'HTML comparison' : 'Text comparison'}`);
  lines.push('');
  lines.push('Summary');
  lines.push('-'.repeat(60));
  lines.push(`Added:    ${result.added}`);
  lines.push(`Removed:  ${result.removed}`);
  lines.push(`Modified: ${result.modified}`);
  lines.push(`Change:   ${result.changePercent}%`);
  lines.push('');

  if (result.htmlDiff) {
    lines.push('HTML Metadata');
    lines.push('-'.repeat(60));
    for (const c of result.htmlDiff.scalarChanges) {
      lines.push(`[${c.status.toUpperCase()}] ${c.field}`);
      if (c.status !== 'equal') {
        lines.push(`  Original: ${c.left || '(empty)'}`);
        lines.push(`  Modified: ${c.right || '(empty)'}`);
      }
    }
    lines.push('');
    lines.push('HTML Content Lists');
    lines.push('-'.repeat(60));
    for (const c of result.htmlDiff.listChanges) {
      lines.push(`${c.field}: +${c.added.length} / -${c.removed.length} / =${c.equal.length}`);
      for (const item of c.added) lines.push(`  + ${item}`);
      for (const item of c.removed) lines.push(`  - ${item}`);
    }
    lines.push('');
  }

  lines.push('Unified Diff');
  lines.push('-'.repeat(60));
  lines.push(result.textDiff.unified);
  lines.push('');
  lines.push('Note: Imported HTML was parsed with DOMParser and never executed.');
  return lines.join('\n');
}

/** Standalone, script-free HTML report. All user content is escaped. */
export function buildHtmlReport(result: CompareResult, meta: InputMeta): string {
  const rowClass = (t: string) => (t === 'added' ? 'add' : t === 'removed' ? 'del' : t === 'modified' ? 'mod' : 'eq');
  const rows = result.textDiff.rows
    .map(
      (r) => `<tr class="${rowClass(r.type)}"><td>${r.leftLine ?? ''}</td><td>${r.rightLine ?? ''}</td><td>${escapeHtml(r.left ?? '')}</td><td>${escapeHtml(r.right ?? '')}</td></tr>`,
    )
    .join('\n');

  const scalars = result.htmlDiff
    ? result.htmlDiff.scalarChanges
        .map((c) => `<tr><td>${escapeHtml(c.field)}</td><td>${escapeHtml(c.left || '(empty)')}</td><td>${escapeHtml(c.right || '(empty)')}</td><td>${c.status}</td></tr>`)
        .join('\n')
    : '';

  const lists = result.htmlDiff
    ? result.htmlDiff.listChanges
        .map((c) => {
          const items = [
            ...c.added.map((i) => `<li class="add">+ ${escapeHtml(i)}</li>`),
            ...c.removed.map((i) => `<li class="del">- ${escapeHtml(i)}</li>`),
          ].join('');
          return `<h3>${escapeHtml(c.field)} (+${c.added.length} / -${c.removed.length})</h3><ul>${items || '<li>no changes</li>'}</ul>`;
        })
        .join('\n')
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Website Diff Report</title>
<style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#111}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:4px 8px;text-align:left;vertical-align:top;white-space:pre-wrap;word-break:break-word}.add td{background:#dcfce7}.del td{background:#fee2e2}.mod td{background:#fef9c3}.eq td{color:#555}pre{background:#f6f6f6;padding:1rem;overflow:auto}</style>
</head><body>
<h1>Website Diff — Change Report</h1>
<p>Generated: ${escapeHtml(result.generatedAt)} · Mode: ${result.mode} · Change: ${result.changePercent}%</p>
<p>Original: ${escapeHtml(meta.labelA)} · Modified: ${escapeHtml(meta.labelB)}</p>
<h2>Summary</h2>
<p>Added: ${result.added} · Removed: ${result.removed} · Modified: ${result.modified}</p>
${scalars ? `<h2>HTML Metadata</h2><table><tr><th>Field</th><th>Original</th><th>Modified</th><th>Status</th></tr>${scalars}</table>` : ''}
${lists ? `<h2>HTML Content Lists</h2>${lists}` : ''}
<h2>Side-by-Side Diff</h2>
<table><tr><th>#</th><th>#</th><th>Original</th><th>Modified</th></tr>${rows}</table>
<h2>Unified Diff</h2>
<pre>${escapeHtml(result.textDiff.unified)}</pre>
<p><em>Imported HTML was parsed with DOMParser and never executed. This report contains no scripts.</em></p>
</body></html>`;
}

/** Machine-readable JSON report. */
export function buildJsonReport(result: CompareResult, meta: InputMeta): string {
  return JSON.stringify(
    {
      tool: 'website-diff',
      generatedAt: result.generatedAt,
      original: { label: meta.labelA, url: meta.urlA ?? null },
      modified: { label: meta.labelB, url: meta.urlB ?? null },
      mode: result.mode,
      summary: {
        added: result.added,
        removed: result.removed,
        modified: result.modified,
        changePercent: result.changePercent,
      },
      html: result.htmlDiff
        ? {
            scalarChanges: result.htmlDiff.scalarChanges,
            listChanges: result.htmlDiff.listChanges,
          }
        : null,
      rows: result.textDiff.rows,
      unifiedDiff: result.textDiff.unified,
    },
    null,
    2,
  );
}

/** Trigger a browser download. Content is generated locally — nothing is uploaded. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
