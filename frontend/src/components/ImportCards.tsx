import { useRef, useState } from 'react';
import { api } from '../api';
import { rowsFromCsv, rowsFromJson, type ImportRow } from '../lib/csv';

export default function ImportCards({ onImported }: { onImported: () => void }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows(null);
    setFileName('');
    setParseError(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setResult(null);
    setError(null);
    try {
      const text = await file.text();
      const isCsv = /\.csv$/i.test(file.name);
      const isJson = /\.json$/i.test(file.name);
      let parsed: ImportRow[];
      if (isCsv) parsed = rowsFromCsv(text);
      else if (isJson) parsed = rowsFromJson(text);
      else parsed = text.trim().startsWith('[') || text.trim().startsWith('{') ? rowsFromJson(text) : rowsFromCsv(text);

      setRows(parsed);
      setFileName(file.name);
    } catch (e) {
      setRows(null);
      setParseError(e instanceof Error ? e.message : 'Could not parse file');
    }
  };

  const valid = rows?.filter((r) => r.front.trim() && r.back.trim()) ?? [];
  const invalidCount = (rows?.length ?? 0) - valid.length;

  const doImport = async () => {
    if (!valid.length) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.importCards(valid);
      setResult(`Imported ${res.imported} card${res.imported === 1 ? '' : 's'}.`);
      if (res.skipped > 0) setResult(`Imported ${res.imported}. ${res.skipped} skipped.`);
      setRows(null);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-100 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Import cards</h3>
        <div className="text-xs text-neutral-400">
          Samples:{' '}
          <a href="/samples/cards.csv" download className="underline underline-offset-2 hover:text-neutral-700">
            CSV
          </a>{' '}
          ·{' '}
          <a href="/samples/cards.json" download className="underline underline-offset-2 hover:text-neutral-700">
            JSON
          </a>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        CSV needs a header row with <code className="text-neutral-600">front,back,mermaid</code> columns.
        JSON is an array of <code className="text-neutral-600">{'{ "front", "back", "mermaid" }'}</code> objects.
      </p>

      <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        Choose a .json or .csv file
      </label>

      {parseError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{parseError}</p>
      )}

      {rows && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              {fileName}: <span className="font-medium">{valid.length}</span> ready
              {invalidCount > 0 && <span className="text-red-500"> · {invalidCount} missing content</span>}
            </span>
            <button onClick={reset} className="text-xs text-neutral-400 hover:text-neutral-700">
              Clear
            </button>
          </div>

          {valid.slice(0, 3).map((r, i) => (
            <div key={i} className="truncate rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              {r.front} <span className="text-neutral-300">→</span> {r.back}
              {r.mermaid ? ' · ◇ mermaid' : ''}
            </div>
          ))}
          {valid.length > 3 && (
            <p className="text-xs text-neutral-400">…and {valid.length - 3} more</p>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            onClick={doImport}
            disabled={!valid.length || importing}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {importing ? 'Importing…' : `Import ${valid.length} card${valid.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {result && <p className="text-sm text-emerald-600">{result}</p>}
    </div>
  );
}
