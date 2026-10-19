import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Mermaid from './Mermaid';
import RelationEditor from './RelationEditor';
import DeckPicker from './DeckPicker';

export default function CardEditor({
  cardId,
  onDone,
  onOpenCard,
}: {
  cardId: string | null;
  /** Called after save/delete. Receives the new card id when one was created. */
  onDone: (createdId?: string) => void;
  /** Open a different card (e.g. from the relation graph). */
  onOpenCard?: (cardId: string) => void;
}) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [mermaid, setMermaid] = useState('');
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(cardId);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    (async () => {
      try {
        const { card } = await api.getCard(cardId);
        if (!cancelled) {
          setFront(card.front);
          setBack(card.back);
          setMermaid(card.mermaid ?? '');
          setImageId(card.imageId);
          setImageUrl(card.imageUrl);
          setDeckId(card.deckId);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load card');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const res = await api.uploadImage(file);
      setImageId(res.image.id);
      setImageUrl(res.image.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload image');
    }
  };

  const removeImage = async () => {
    if (imageId) {
      // Best-effort cleanup; the card's reference is what matters.
      api.deleteImage(imageId).catch(() => undefined);
    }
    setImageId(null);
    setImageUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!front.trim() || !back.trim()) {
      setError('Both sides are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        front: front.trim(),
        back: back.trim(),
        mermaid: mermaid.trim() || null,
        imageId: imageId ?? null,
        deckId: deckId ?? null,
      };
      if (cardId) {
        await api.updateCard(cardId, payload);
        onDone();
      } else {
        const res = await api.createCard(payload);
        // Hand the new id back so the parent can switch into edit mode and
        // let the user attach relations immediately.
        onDone(res.card.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!cardId) return;
    if (!window.confirm('Delete this card?')) return;
    setDeleting(true);
    try {
      await api.deleteCard(cardId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete card');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit card' : 'New card'}</h2>
        <button onClick={() => onDone()} className="text-sm text-neutral-400 hover:text-neutral-700">
          Done
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-600">Deck</span>
        <DeckPicker value={deckId} onChange={(v) => setDeckId(v ?? null)} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-600">Front (question)</span>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={3}
          placeholder="What is the capital of France?"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-600">Back (answer)</span>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={3}
          placeholder="Paris"
          className="rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-600">Image</span>
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt="card"
              className="max-h-56 w-auto rounded-lg border border-neutral-100 object-contain"
            />
            <button
              onClick={removeImage}
              className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs text-red-600 shadow-sm hover:bg-white"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
            Click to upload an image
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-600">Mermaid diagram (optional)</span>
          <button
            onClick={() => setShowPreview((s) => !s)}
            className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline"
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
        </div>
        <textarea
          value={mermaid}
          onChange={(e) => setMermaid(e.target.value)}
          rows={4}
          placeholder="graph TD; A-->B;"
          className="rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-neutral-400 focus:outline-none"
        />
        {showPreview && mermaid.trim() && (
          <div className="rounded-lg border border-neutral-100 p-3">
            <Mermaid code={mermaid} />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save card'}
        </button>
        {isEdit && (
          <button
            onClick={remove}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Delete
          </button>
        )}
      </div>

      {cardId && <RelationEditor cardId={cardId} onOpenCard={onOpenCard} />}
    </div>
  );
}
