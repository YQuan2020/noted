import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Card, Grade } from '../types';
import CardFace from './CardFace';

const GRADES: { key: Grade; label: string; short: string; className: string }[] = [
  { key: 'again', label: 'Again', short: '1', className: 'text-red-600 border-red-200 hover:bg-red-50' },
  { key: 'hard', label: 'Hard', short: '2', className: 'text-amber-600 border-amber-200 hover:bg-amber-50' },
  { key: 'good', label: 'Good', short: '3', className: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' },
  { key: 'easy', label: 'Easy', short: '4', className: 'text-sky-600 border-sky-200 hover:bg-sky-50' },
];

export default function ReviewSession({
  onEdit,
  onEmpty,
}: {
  onEdit: (id: string) => void;
  onEmpty?: () => void;
}) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReview();
      setQueue(res.cards);
      setTotal(res.total);
      setFlipped(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[0];

  const grade = async (g: Grade) => {
    if (!current) return;
    try {
      await api.reviewCard(current.id, g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save grade');
      return;
    }
    // Drop this card; re-append at the end if the user failed it ("again").
    setQueue((prev) => {
      const rest = prev.slice(1);
      return g === 'again' ? [...rest, current] : rest;
    });
    setFlipped(false);
  };

  // Keyboard: space/enter to flip, 1–4 to grade.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (current) setFlipped((f) => !f);
        return;
      }
      if (flipped && current) {
        const idx = Number(e.key) - 1;
        if (GRADES[idx]) grade(GRADES[idx].key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, flipped, grade]);

  if (loading) {
    return <p className="py-24 text-center text-neutral-400">Loading…</p>;
  }

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={load} className="mt-4 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  if (!current) {
    if (onEmpty) onEmpty();
    return (
      <div className="py-24 text-center">
        <div className="text-4xl">✓</div>
        <p className="mt-4 text-lg text-neutral-600">You&apos;re all caught up.</p>
        <p className="mt-1 text-sm text-neutral-400">No cards are due right now.</p>
        <button
          onClick={load}
          className="mt-6 rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Check again
        </button>
      </div>
    );
  }

  const done = total - queue.length;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <span>
          {done} of {Math.max(total, queue.length + done)} done
        </span>
        <button
          onClick={() => onEdit(current.id)}
          className="text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline"
        >
          Edit card
        </button>
      </div>

      <div className="flip-card" onClick={() => setFlipped((f) => !f)}>
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="flip-face flex min-h-[20rem] cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:min-h-[24rem] sm:p-8">
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Question
            </div>
            <CardFace card={current} side="front" />
          </div>
          {/* Back */}
          <div className="flip-face flip-back absolute inset-0 flex min-h-[20rem] cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm sm:min-h-[24rem] sm:p-8">
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Answer
            </div>
            <CardFace card={current} side="back" />
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-neutral-400">
        Tap the card to flip · or press <kbd>Space</kbd>
      </div>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button
              key={g.key}
              onClick={() => grade(g.key)}
              className={`rounded-lg border py-3 text-sm font-medium transition-colors ${g.className}`}
            >
              {g.label}
              <span className="mt-0.5 block text-xs opacity-60">{g.short}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Show answer
        </button>
      )}
    </div>
  );
}
