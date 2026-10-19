import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Card } from '../types';
import CardFace from '../components/CardFace';

/**
 * Read-only view of a single card, shown as a flip card. Reached from the
 * relation graph; editing happens from here via the Edit button.
 */
export default function CardView({
  cardId,
  onEdit,
  onDone,
}: {
  cardId: string;
  onEdit: (cardId: string) => void;
  onDone: () => void;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setFlipped(false);
    setError(null);
    api
      .getCard(cardId)
      .then((r) => {
        if (!cancelled) setCard(r.card);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load card');
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={onDone} className="mt-4 text-sm text-neutral-700 underline underline-offset-2">
          Back
        </button>
      </div>
    );
  }

  if (!card) {
    return <p className="py-24 text-center text-neutral-400">Loading…</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Card</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onEdit(card.id)}
            className="text-sm text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
          >
            Edit
          </button>
          <button onClick={onDone} className="text-sm text-neutral-400 hover:text-neutral-700">
            Done
          </button>
        </div>
      </div>

      <div className="flip-card" onClick={() => setFlipped((f) => !f)}>
        <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
          <div className="flip-face flex min-h-[20rem] cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:min-h-[24rem] sm:p-8">
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Question
            </div>
            <CardFace card={card} side="front" />
          </div>
          <div className="flip-face flip-back absolute inset-0 flex min-h-[20rem] cursor-pointer flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm sm:min-h-[24rem] sm:p-8">
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Answer
            </div>
            <CardFace card={card} side="back" />
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-neutral-400">Tap the card to flip</div>

      <button
        onClick={() => onEdit(card.id)}
        className="rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Edit card
      </button>
    </div>
  );
}
