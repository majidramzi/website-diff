import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Columns2,
  FileCode2,
  GitCompare,
  Info,
  Loader2,
  Moon,
  Rows3,
  ShieldCheck,
  Sparkles,
  Sun,
  Eye,
} from 'lucide-react';
import InputPanel from './components/InputPanel';
import OptionsPanel from './components/OptionsPanel';
import SummaryPanel from './components/SummaryPanel';
import SideBySideView from './components/SideBySideView';
import UnifiedView from './components/UnifiedView';
import HtmlContentView from './components/HtmlContentView';
import SourcePreview from './components/SourcePreview';
import ExportBar from './components/ExportBar';
import type { CompareOptions, CompareResult } from './lib/types';
import { DEFAULT_OPTIONS } from './lib/types';
import { compareContents } from './lib/compare';
import { fetchUrlText, readFileText } from './lib/fetchUrl';
import { SAMPLE_A, SAMPLE_B } from './lib/samples';

type Mode = 'auto' | 'text' | 'html';
type TabId = 'summary' | 'side' | 'unified' | 'html' | 'normalized' | 'preview';

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode; htmlOnly?: boolean }> = [
  { id: 'summary', label: 'Summary', icon: <Sparkles size={14} /> },
  { id: 'side', label: 'Side-by-side', icon: <Columns2 size={14} /> },
  { id: 'unified', label: 'Unified diff', icon: <Rows3 size={14} /> },
  { id: 'html', label: 'HTML content', icon: <FileCode2 size={14} />, htmlOnly: true },
  { id: 'normalized', label: 'Normalized HTML', icon: <GitCompare size={14} />, htmlOnly: true },
  { id: 'preview', label: 'Sanitized preview', icon: <Eye size={14} /> },
];

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('website-diff-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [valueA, setValueA] = useState('');
  const [valueB, setValueB] = useState('');
  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [fileA, setFileA] = useState<string | null>(null);
  const [fileB, setFileB] = useState<string | null>(null);
  const [errA, setErrA] = useState<string | null>(null);
  const [errB, setErrB] = useState<string | null>(null);
  const [fetchingA, setFetchingA] = useState(false);
  const [fetchingB, setFetchingB] = useState(false);

  const [options, setOptions] = useState<CompareOptions>({ ...DEFAULT_OPTIONS });
  const [ignoreTagsInput, setIgnoreTagsInput] = useState(DEFAULT_OPTIONS.ignoreTags.join(', '));
  const [mode, setMode] = useState<Mode>('auto');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [tab, setTab] = useState<TabId>('summary');
  const [collapseEqual, setCollapseEqual] = useState(true);
  const [showCors, setShowCors] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('website-diff-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const runCompare = useCallback(() => {
    if (!valueA.trim() && !valueB.trim()) {
      setErrA(valueA.trim() ? null : 'Add content to the Original panel first.');
      setErrB(valueB.trim() ? null : 'Add content to the Modified panel first.');
      return;
    }
    setErrA(null);
    setErrB(null);
    try {
      const res = compareContents(valueA, valueB, options, mode);
      setResult(res);
      // Keep the current tab unless it only exists for HTML results.
      setTab((current) => {
        const def = TABS.find((t) => t.id === current);
        return def?.htmlOnly && res.mode !== 'html' ? 'summary' : current;
      });
    } catch (e) {
      setErrA(e instanceof Error ? `Comparison failed: ${e.message}` : 'Comparison failed.');
      setResult(null);
    }
  }, [valueA, valueB, options, mode]);

  // Cmd/Ctrl + Enter runs the comparison.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCompare();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runCompare]);

  const handleFetch = async (side: 'A' | 'B') => {
    const url = (side === 'A' ? urlA : urlB).trim();
    if (!url) return;
    const setFetching = side === 'A' ? setFetchingA : setFetchingB;
    const setErr = side === 'A' ? setErrA : setErrB;
    const setValue = side === 'A' ? setValueA : setValueB;
    setErr(null);
    setFetching(true);
    try {
      const text = await fetchUrlText(url);
      setValue(text);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Fetch failed.');
    } finally {
      setFetching(false);
    }
  };

  const handleFile = async (side: 'A' | 'B', file: File) => {
    const setErr = side === 'A' ? setErrA : setErrB;
    const setValue = side === 'A' ? setValueA : setValueB;
    const setLabel = side === 'A' ? setFileA : setFileB;
    setErr(null);
    try {
      const text = await readFileText(file);
      setValue(text);
      setLabel(`${file.name} · ${(file.size / 1024).toFixed(1)} KB`);
    } catch {
      setErr(`Could not read "${file.name}".`);
    }
  };

  const swap = () => {
    setValueA(valueB);
    setValueB(valueA);
    setUrlA(urlB);
    setUrlB(urlA);
    setFileA(fileB);
    setFileB(fileA);
    setErrA(null);
    setErrB(null);
    setResult(null);
  };

  const loadSample = () => {
    setMode('html');
    setValueA(SAMPLE_A);
    setValueB(SAMPLE_B);
    setUrlA('');
    setUrlB('');
    setFileA('sample-original.html');
    setFileB('sample-modified.html');
    setErrA(null);
    setErrB(null);
    setResult(null);
  };

  const labelA = fileA ?? (urlA.trim() ? urlA.trim() : 'Original (pasted)');
  const labelB = fileB ?? (urlB.trim() ? urlB.trim() : 'Modified (pasted)');
  const meta = useMemo(() => ({ labelA, labelB, urlA: urlA.trim() || undefined, urlB: urlB.trim() || undefined }), [labelA, labelB, urlA, urlB]);

  const visibleTabs = TABS.filter((t) => !t.htmlOnly || result?.mode === 'html');
  const normalizedAvailable = result?.htmlDiff?.normalizedDiff != null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sky-400 dark:bg-sky-500 dark:text-white">
              <GitCompare size={18} />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">Website Diff</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Compare two versions of website content · 100% in-browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={loadSample}>
              <Sparkles size={14} />
              Load sample
            </button>
            <button
              type="button"
              className="btn-ghost !px-2.5"
              onClick={() => setDark((d) => !d)}
              title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <a
              className="btn-ghost"
              href="https://github.com/majidramzi/website-diff"
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-5">
        {/* Inputs */}
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <InputPanel
            side="A"
            heading={labelA}
            accent="bg-slate-600 dark:bg-slate-700"
            value={valueA}
            onChange={(v) => {
              setValueA(v);
              setErrA(null);
            }}
            url={urlA}
            onUrlChange={setUrlA}
            onFetchUrl={() => handleFetch('A')}
            fetching={fetchingA}
            error={errA}
            onFile={(f) => handleFile('A', f)}
            fileLabel={fileA}
            onClear={() => {
              setValueA('');
              setUrlA('');
              setFileA(null);
              setErrA(null);
            }}
            placeholder={'Paste the ORIGINAL content here…\n\nPlain text, or a full HTML document.\nNothing you paste is uploaded — it stays in this tab.'}
            inputKind={mode === 'text' ? 'text' : 'html'}
          />

          <div className="flex items-center justify-center lg:flex-col">
            <button type="button" className="btn-ghost !px-2.5" onClick={swap} title="Swap Original ↔ Modified">
              <ArrowLeftRight size={15} />
            </button>
          </div>

          <InputPanel
            side="B"
            heading={labelB}
            accent="bg-sky-600"
            value={valueB}
            onChange={(v) => {
              setValueB(v);
              setErrB(null);
            }}
            url={urlB}
            onUrlChange={setUrlB}
            onFetchUrl={() => handleFetch('B')}
            fetching={fetchingB}
            error={errB}
            onFile={(f) => handleFile('B', f)}
            fileLabel={fileB}
            onClear={() => {
              setValueB('');
              setUrlB('');
              setFileB(null);
              setErrB(null);
            }}
            placeholder={'Paste the MODIFIED content here…\n\nPlain text, or a full HTML document.\nNothing you paste is uploaded — it stays in this tab.'}
            inputKind={mode === 'text' ? 'text' : 'html'}
          />
        </div>

        {/* CORS explainer */}
        <div className="card p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setShowCors((s) => !s)}
            aria-expanded={showCors}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <Info size={15} className="text-sky-500" />
              About URL fetching and browser CORS restrictions
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{showCors ? 'Hide' : 'Show'}</span>
          </button>
          {showCors && (
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                This tool is a static page with no backend, so URL fetching uses the browser <strong>Fetch API directly</strong>. Browsers
                enforce the same-origin policy: the remote server must send an{' '}
                <code className="font-mono text-[11px]">Access-Control-Allow-Origin</code> header permitting this origin, otherwise the
                response is blocked and cannot be read.
              </p>
              <p>
                <strong>Most public websites block cross-origin reads.</strong> When that happens you will see a clear CORS error in the
                panel instead of silent failure. No proxy, server-side fetcher or paid service is used — by design, and for your privacy.
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                <span>
                  Workarounds when a site blocks you: (1) open the page, press <kbd className="font-mono">Ctrl/Cmd+S</kbd> and upload the saved
                  file; (2) view page source and paste it here; (3) run{' '}
                  <code className="font-mono text-[11px]">curl -s URL &gt; page.html</code> locally and upload the result; (4) host a static
                  copy on a server that allows CORS.
                </span>
              </p>
            </div>
          )}
        </div>

        <OptionsPanel
          options={options}
          onChange={setOptions}
          mode={mode}
          onModeChange={setMode}
          ignoreTagsInput={ignoreTagsInput}
          onIgnoreTagsInput={setIgnoreTagsInput}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary !px-5 !py-2.5 text-base" onClick={runCompare} disabled={fetchingA || fetchingB}>
            {fetchingA || fetchingB ? <Loader2 size={16} className="animate-spin" /> : <GitCompare size={16} />}
            Compare versions
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Shortcut: <kbd className="rounded border border-slate-300 px-1 font-mono dark:border-slate-700">Ctrl/Cmd</kbd> +{' '}
            <kbd className="rounded border border-slate-300 px-1 font-mono dark:border-slate-700">Enter</kbd>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck size={13} className="text-emerald-500" />
            Imported HTML is parsed with DOMParser and never executed.
          </span>
        </div>

        {/* Results */}
        {result ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tab ${
                      tab === t.id
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="flex flex-wrap items-center gap-2">
                {tab === 'side' && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-sky-600"
                      checked={collapseEqual}
                      onChange={(e) => setCollapseEqual(e.target.checked)}
                    />
                    Collapse unchanged lines
                  </label>
                )}
                {/* Persistent stats — visible on every result tab */}
                <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  +{result.added} added
                </span>
                <span className="chip bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                  −{result.removed} removed
                </span>
                <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                  ~{result.modified} modified
                </span>
                <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300">
                  {result.changePercent}% changed
                </span>
              </div>
            </div>

            {tab === 'summary' && <SummaryPanel result={result} />}

            {tab === 'side' && (
              <SideBySideView
                rows={result.mode === 'html' && result.htmlDiff ? result.htmlDiff.textDiff.rows : result.textDiff.rows}
                labelA={labelA}
                labelB={labelB}
                collapseEqual={collapseEqual}
              />
            )}

            {tab === 'unified' && <UnifiedView unified={result.textDiff.unified} />}

            {tab === 'html' && result.htmlDiff && <HtmlContentView diff={result.htmlDiff} />}

            {tab === 'normalized' &&
              (normalizedAvailable ? (
                <UnifiedView unified={result.htmlDiff!.normalizedDiff!.unified} variant="normalized-html" />
              ) : (
                <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
                  Enable <strong>Compare normalized HTML</strong> in the settings to produce this diff.
                </div>
              ))}

            {tab === 'preview' && <SourcePreview htmlA={valueA} htmlB={valueB} />}

            <ExportBar result={result} meta={meta} />
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <GitCompare size={22} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">No comparison yet</h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Paste two versions, upload two files, or fetch two URLs — then press <strong>Compare versions</strong>. Added, removed and
                modified content is highlighted side by side and as a unified diff, and the report can be exported as TXT, HTML or JSON.
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={loadSample}>
              <Sparkles size={14} />
              Try it with a sample page
            </button>
          </div>
        )}

        <footer className="border-t border-slate-200 pt-4 pb-8 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Website Diff · static client-side tool · React 19 + TypeScript + Vite + Tailwind · MIT License ·{' '}
          <a className="underline decoration-dotted" href="https://github.com/majidramzi/website-diff" target="_blank" rel="noreferrer noopener">
            github.com/majidramzi/website-diff
          </a>
        </footer>
      </main>
    </div>
  );
}
