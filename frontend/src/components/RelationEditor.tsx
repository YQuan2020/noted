import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Card, Relation } from '../types';

/**
 * Manage the relationships of one card. A relationship links this card to a
 * target card and may reference a third "relation card" that describes the
 * relationship itself (that card is just a normal flashcard in the deck).
 */
export default function RelationEditor({ cardId }: { cardId: string }) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [targetId, setTargetId] = useState('');
  const [relationCardId, setRelationCardId] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [relRes, cardRes] = await Promise.all([
        api.listRelations(cardId),
        api.listCards(),
      ]);
      setRelations(relRes.relations);
      setCards(cardRes.cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load relations');
    }
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  const others = cards.filter((c) => c.id !== cardId);

  const add = async () => {
    if (!targetId) return;
    setBusy(true);
    setError(null);
    try {
      await api.createRelation({
        sourceCardId: cardId,
        targetCardId: targetId,
        relationCardId: relationCardId || null,
        label: label.trim() || null,
      });
      setTargetId('');
      setRelationCardId('');
      setLabel('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create relation');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteRelation(id);
      setRelations((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete relation');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-700">Relations</h3>

      {relations.length === 0 ? (
        <p className="text-sm text-neutral-400">No relations yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {relations.map((r) => {
            const other = r.sourceCard?.id === cardId ? r.targetCard : r.sourceCard;
            return (
              <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="text-neutral-400">↔</span>
                <span className="flex-1 truncate text-neutral-700">
                  {other?.front ?? '(missing card)'}
                  {r.label ? (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                      {r.label}
                    </span>
                  ) : null}
                  {r.relationCard ? (
                    <span className="ml-2 text-xs text-neutral-400">
                      described by “{r.relationCard.front}”
                    </span>
                  ) : null}
                </span>
                <button
                  onClick={() => remove(r.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-2 rounded-lg border border-neutral-100 p-3">
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Link to a card…</option>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.front.slice(0, 60)}
            </option>
          ))}
        </select>

        <select
          value={relationCardId}
          onChange={(e) => setRelationCardId(e.target.value)}
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Relation card (optional)…</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.front.slice(0, 60)}
            </option>
          ))}
        </select>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={add}
          disabled={!targetId || busy}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          Add relation
        </button>
      </div>
    </div>
  );
}
