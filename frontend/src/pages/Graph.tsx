import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Relation } from '../types';
import RelationGraph from '../components/RelationGraph';
import ImportRelations from '../components/ImportRelations';

export default function Graph({ onOpenCard }: { onOpenCard: (cardId: string) => void }) {
  const [relations, setRelations] = useState<Relation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const load = () => {
    setError(null);
    api
      .listRelations()
      .then((r) => setRelations(r.relations))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load relations'));
  };

  useEffect(load, []);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Relations</h2>
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
      </div>

      {showImport && (
        <div className="mb-4">
          <ImportRelations onImported={load} />
        </div>
      )}

      {error && <p className="py-16 text-center text-red-600">{error}</p>}

      {!error && !relations && <p className="py-16 text-center text-neutral-400">Loading…</p>}

      {!error && relations && relations.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-neutral-500">No relations yet.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Open a card and add a relation, or import them above, to see them mapped here.
          </p>
        </div>
      )}

      {!error && relations && relations.length > 0 && (
        <>
          <p className="mb-4 text-sm text-neutral-400">
            {relations.length} link{relations.length === 1 ? '' : 's'} · a dotted line marks a card
            that describes a relation
          </p>
          <div className="overflow-x-auto rounded-lg border border-neutral-100 bg-white p-3">
            <RelationGraph relations={relations} onOpen={onOpenCard} />
          </div>
        </>
      )}
    </div>
  );
}
