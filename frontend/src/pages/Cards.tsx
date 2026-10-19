import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Card } from '../types';
import DeckPicker from '../components/DeckPicker';
import ImportCards from '../components/ImportCards';

export default function Cards({
  onEdit,
  onNew,
  initialDeckId,
}: {
  onEdit: (id: string) => void;
  onNew: () => void;
  initialDeckId?: string | null;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState('');
  const [deckId, setDeckId] = useState<string | null | undefined>(initialDeckId);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unfilingId, setUnfilingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .listCards(q.trim() || undefined, deckId)
        .then((r) => setCards(r.cards))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, deckId, refreshKey]);

  const unfile = async (c: Card) => {
    setUnfilingId(c.id);
    try {
      await api.updateCard(c.id, { deckId: null });
      setRefreshKey((k) => k + 1);
    } catch {
      /* leave the list unchanged; a retry is a tap away */
    } finally {
      setUnfilingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cards</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport((s) => !s)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              showImport
                ? 'border-neutral-300 text-neutral-900'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
            }`}
          >
            Import
          </button>
          <button
            onClick={onNew}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            + New
          </button>
        </div>
      </div>

      {showImport && (
        <div className="mb-5">
          <ImportCards
            defaultDeckId={deckId === undefined ? null : deckId}
            onImported={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <DeckPicker value={deckId} onChange={setDeckId} includeAll className="flex-1" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-32 rounded-lg border border-neutral-200 px-3 py-1.5 text-base focus:border-neutral-400 focus:outline-none sm:w-40"
        />
      </div>

      {loading ? (
        <p className="py-16 text-center text-neutral-400">Loading…</p>
      ) : cards.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-neutral-500">No cards here.</p>
          <button onClick={onNew} className="mt-3 text-sm text-neutral-700 underline underline-offset-2">
            Create a card
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <button
                onClick={() => onEdit(c.id)}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left hover:bg-neutral-50"
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt=""
                    className="h-10 w-10 flex-none rounded-md border border-neutral-100 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-400">
                    {c.mermaid ? '◇' : 'Aa'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-neutral-900">{c.front}</p>
                  <p className="truncate text-sm text-neutral-400">{c.back}</p>
                </div>
                {c.reps > 0 && (
                  <span className="flex-none text-xs text-neutral-400">
                    {c.intervalDays < 1 ? '<1d' : `${Math.round(c.intervalDays)}d`}
                  </span>
                )}
              </button>
              {c.deckId && (
                <button
                  onClick={() => unfile(c)}
                  disabled={unfilingId === c.id}
                  title="Remove from deck"
                  className="flex-none rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-400 hover:border-neutral-300 hover:text-neutral-700 disabled:opacity-40"
                >
                  Unfile
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
