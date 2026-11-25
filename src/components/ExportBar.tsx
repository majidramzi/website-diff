import { useState } from 'react';
import { Braces, Check, Copy, FileCode2, FileDown, FileText } from 'lucide-react';
import type { CompareResult, InputMeta } from '../lib/types';
import { buildHtmlReport, buildJsonReport, buildTextReport, downloadFile } from '../lib/export';

interface Props {
  result: CompareResult;
  meta: InputMeta;
}

export default function ExportBar({ result, meta }: Props) {
  const [copied, setCopied] = useState(false);
  const stamp = result.generatedAt.slice(0, 19).replace(/[:T]/g, '-');

  const exportTxt = () => downloadFile(`website-diff-${stamp}.txt`, buildTextReport(result, meta), 'text/plain;charset=utf-8');
  const exportHtml = () => downloadFile(`website-diff-${stamp}.html`, buildHtmlReport(result, meta), 'text/html;charset=utf-8');
  const exportJson = () => downloadFile(`website-diff-${stamp}.json`, buildJsonReport(result, meta), 'application/json;charset=utf-8');

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildTextReport(result, meta));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <FileDown size={15} className="text-sky-500" />
          Export change report
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Generated locally in your browser — nothing is uploaded anywhere.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={exportTxt}>
          <FileText size={14} /> TXT
        </button>
        <button type="button" className="btn-ghost" onClick={exportHtml}>
          <FileCode2 size={14} /> HTML
        </button>
        <button type="button" className="btn-ghost" onClick={exportJson}>
          <Braces size={14} /> JSON
        </button>
        <button type="button" className="btn-ghost" onClick={copyReport}>
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
