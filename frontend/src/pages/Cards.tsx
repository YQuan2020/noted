import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Card } from '../types';

export default function Cards({
  onEdit,
  onNew,
}: {
  onEdit: (id: string) => void;
  onNew: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .listCards(q.trim() || undefined)
        .then((r) => setCards(r.cards))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cards</h2>
        <button
          onClick={onNew}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + New
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cards…"
        className="mb-4 w-full rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
      />

      {loading ? (
        <p className="py-16 text-center text-neutral-400">Loading…</p>
      ) : cards.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-neutral-500">No cards yet.</p>
          <button onClick={onNew} className="mt-3 text-sm text-neutral-700 underline underline-offset-2">
            Create your first card
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {cards.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onEdit(c.id)}
                className="flex w-full items-center gap-3 py-3 text-left hover:bg-neutral-50"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
