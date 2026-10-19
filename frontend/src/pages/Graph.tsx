import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Relation } from '../types';
import RelationGraph from '../components/RelationGraph';

export default function Graph() {
  const [relations, setRelations] = useState<Relation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRelations()
      .then((r) => setRelations(r.relations))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load relations'));
  }, []);

  if (error) {
    return <p className="py-16 text-center text-red-600">{error}</p>;
  }

  if (!relations) {
    return <p className="py-16 text-center text-neutral-400">Loading…</p>;
  }

  if (relations.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-neutral-500">No relations yet.</p>
        <p className="mt-1 text-sm text-neutral-400">
          Open a card and add a relation to see it mapped here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-1 text-lg font-semibold">Relations</h2>
      <p className="mb-4 text-sm text-neutral-400">
        {relations.length} link{relations.length === 1 ? '' : 's'} · a dotted line marks a card
        that describes a relation
      </p>
      <div className="overflow-x-auto rounded-lg border border-neutral-100 bg-white p-3">
        <RelationGraph relations={relations} />
      </div>
    </div>
  );
}
