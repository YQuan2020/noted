import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useDecks } from '../hooks/useDecks';

export default function Decks({
  onOpen,
  onStudy,
}: {
  /** Open a deck in the Cards view (undefined = All, null = Unfiled). */
  onOpen: (deckId: string | null | undefined) => void;
  /** Study a deck (undefined = All, null = Unfiled). */
  onStudy: (deckId: string | null | undefined) => void;
}) {
  const { decks, stats, refresh } = useDecks();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createDeck(newName.trim());
      setNewName('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck');
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    setError(null);
    try {
      await api.renameDeck(id, editName.trim());
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename deck');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this deck? Its cards will become unfiled.')) return;
    setError(null);
    try {
      await api.deleteDeck(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deck');
    }
  };

  const Row = ({
    title,
    subtitle,
    due,
    onClick,
    actions,
  }: {
    title: string;
    subtitle: string;
    due: number;
    onClick: () => void;
    actions?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3 border-b border-neutral-100 py-3">
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate text-neutral-900">{title}</p>
          <p className="text-sm text-neutral-400">{subtitle}</p>
        </div>
        {due > 0 && (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{due} due</span>
        )}
      </button>
      {actions}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="mb-5 text-lg font-semibold">Decks</h2>

      <form onSubmit={create} className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New deck name…"
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          Create
        </button>
      </form>

      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      <Row
        title="All decks"
        subtitle={`${stats?.total.cardCount ?? 0} cards`}
        due={stats?.total.dueCount ?? 0}
        onClick={() => onOpen(undefined)}
        actions={
          <button
            onClick={() => onStudy(undefined)}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400"
          >
            Study
          </button>
        }
      />

      <Row
        title="Unfiled"
        subtitle={`${stats?.unfiled.cardCount ?? 0} cards`}
        due={stats?.unfiled.dueCount ?? 0}
        onClick={() => onOpen(null)}
        actions={
          <button
            onClick={() => onStudy(null)}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400"
          >
            Study
          </button>
        }
      />

      {decks.map((d) => (
        <div key={d.id} className="flex items-center gap-3 border-b border-neutral-100 py-3">
          {editingId === d.id ? (
            <div className="flex min-w-0 flex-1 gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none"
              />
              <button
                onClick={() => saveRename(d.id)}
                className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-white"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button onClick={() => onOpen(d.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-neutral-900">{d.name}</p>
                  <p className="text-sm text-neutral-400">{d.cardCount} cards</p>
                </div>
                {d.dueCount > 0 && (
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{d.dueCount} due</span>
                )}
              </button>
              <button
                onClick={() => onStudy(d.id)}
                className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400"
              >
                Study
              </button>
              <button
                onClick={() => {
                  setEditingId(d.id);
                  setEditName(d.name);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Rename
              </button>
              <button onClick={() => remove(d.id)} className="text-xs text-red-400 hover:text-red-600">
                Delete
              </button>
            </>
          )}
        </div>
      ))}

      {decks.length === 0 && !stats?.unfiled.cardCount && (
        <p className="py-8 text-center text-sm text-neutral-400">Create a deck to organize your cards.</p>
      )}
    </div>
  );
}
