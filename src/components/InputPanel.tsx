import { useRef } from 'react';
import { Globe, Loader2, Trash2, Upload } from 'lucide-react';

export type Side = 'A' | 'B';

interface Props {
  side: Side;
  heading: string;
  accent: string;
  value: string;
  onChange: (value: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
  onFetchUrl: () => void;
  fetching: boolean;
  error: string | null;
  onFile: (file: File) => void;
  fileLabel: string | null;
  onClear: () => void;
  placeholder: string;
  inputKind: 'text' | 'html';
}

export default function InputPanel({
  side,
  heading,
  accent,
  value,
  onChange,
  url,
  onUrlChange,
  onFetchUrl,
  fetching,
  error,
  onFile,
  fileLabel,
  onClear,
  placeholder,
  inputKind,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const chars = value.length;
  const lines = value === '' ? 0 : value.split('\n').length;

  return (
    <section className="card flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`chip text-white ${accent}`}>
            {side === 'A' ? 'Original' : 'Modified'}
          </span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{heading}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
            {lines.toLocaleString()} lines · {chars.toLocaleString()} chars
          </span>
          <button
            type="button"
            className="btn-ghost !px-2 !py-1.5"
            onClick={onClear}
            disabled={!value && !url && !fileLabel}
            title="Clear this panel"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <label className="panel-title mb-1.5 block" htmlFor={`url-${side}`}>
            Optional URL — fetched directly by your browser
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id={`url-${side}`}
                className="input pl-9"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://example.com/page.html"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onFetchUrl();
                }}
              />
            </div>
            <button type="button" className="btn-ghost shrink-0" onClick={onFetchUrl} disabled={fetching || !url.trim()}>
              {fetching ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              {fetching ? 'Loading…' : 'Fetch'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={inputKind === 'html' ? '.html,.htm,.txt,text/html,text/plain' : '.txt,.html,.htm,.md,text/plain,text/html'}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
            Upload file
          </button>
          {fileLabel && (
            <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{fileLabel}</span>
          )}
        </div>

        {error && (
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <textarea
          className="textarea min-h-[220px] flex-1"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${heading} content`}
        />
      </div>
    </section>
  );
}
