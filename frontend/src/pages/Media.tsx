import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { Media as MediaItem, MediaType } from '../types';
import DeckPicker from '../components/DeckPicker';
import ArticleReader from '../components/ArticleReader';

const TYPES: { key: MediaType; label: string; icon: string }[] = [
  { key: 'video', label: 'Video', icon: '▶' },
  { key: 'audio', label: 'Audio', icon: '♪' },
  { key: 'article', label: 'Article', icon: '¶' },
];

const typeMeta = (t: MediaType) => TYPES.find((x) => x.key === t)!;

/**
 * Media library: videos, audio, and articles, each filed under a deck.
 * An item carries a URL link and/or an uploaded video/audio file.
 */
export default function Media() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<MediaType | null>(null);
  const [deckId, setDeckId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<MediaType>('video');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [content, setContent] = useState('');
  const [formDeckId, setFormDeckId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cardOpen, setCardOpen] = useState(false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardDeckId, setCardDeckId] = useState<string | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .listMedia(typeFilter, deckId)
        .then((r) => setItems(r.media))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [typeFilter, deckId, refreshKey]);

  const openNew = () => {
    setEditing(null);
    setType('video');
    setTitle('');
    setUrl('');
    setNotes('');
    setContent('');
    setFormDeckId(deckId === undefined ? null : deckId);
    setFileId(null);
    setFileUrl(null);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m: MediaItem) => {
    setEditing(m);
    setType(m.type);
    setTitle(m.title);
    setUrl(m.url ?? '');
    setNotes(m.notes ?? '');
    setContent(m.content ?? '');
    setFormDeckId(m.deckId);
    setFileId(m.fileId);
    setFileUrl(m.fileUrl);
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadMediaFile(file);
      setFileId(res.file.id);
      setFileUrl(res.file.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFileId(null);
    setFileUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const fetchContent = async () => {
    if (!url.trim()) {
      setError('Enter a link first');
      return;
    }
    setFetching(true);
    setError(null);
    try {
      const res = await api.fetchArticle(url.trim());
      if (!title.trim()) setTitle(res.title);
      setContent(res.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch article');
    } finally {
      setFetching(false);
    }
  };

  const openAddCard = (word: string, deckId: string | null) => {
    setCardFront(word);
    setCardBack('');
    setCardDeckId(deckId);
    setCardError(null);
    setCardOpen(true);
  };

  const saveCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) {
      setCardError('Both sides are required');
      return;
    }
    setSavingCard(true);
    setCardError(null);
    try {
      await api.createCard({
        front: cardFront.trim(),
        back: cardBack.trim(),
        deckId: cardDeckId ?? null,
      });
      setAddedMsg(`Added “${cardFront.trim()}” to cards`);
      setCardOpen(false);
      window.setTimeout(() => setAddedMsg(null), 2500);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Failed to add card');
    } finally {
      setSavingCard(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        title: title.trim(),
        url: url.trim() || null,
        notes: notes.trim() || null,
        content: type === 'article' ? content.trim() || null : null,
        fileId: type === 'article' ? null : fileId ?? null,
        deckId: formDeckId ?? null,
      };
      if (editing) await api.updateMedia(editing.id, payload);
      else await api.createMedia(payload);
      closeForm();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: MediaItem) => {
    if (!window.confirm('Delete this media item?')) return;
    setError(null);
    try {
      await api.deleteMedia(m.id);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Media</h2>
        <button
          onClick={openNew}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + New
        </button>
      </div>

      <div className="mb-4 flex gap-1.5">
        <button
          onClick={() => setTypeFilter(null)}
          className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
            typeFilter === null
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
          }`}
        >
          All
        </button>
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(typeFilter === t.key ? null : t.key)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
              typeFilter === t.key
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <DeckPicker value={deckId} onChange={setDeckId} includeAll className="w-full" />
      </div>

      {showForm && (
        <form onSubmit={save} className="mb-5 space-y-4 rounded-lg border border-neutral-100 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-700">
              {editing ? 'Edit media' : 'New media'}
            </h3>
            <button type="button" onClick={closeForm} className="text-xs text-neutral-400 hover:text-neutral-700">
              Cancel
            </button>
          </div>

          <div className="flex gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setType(t.key);
                  if (t.key === 'article') {
                    setFileId(null);
                    setFileUrl(null);
                  }
                }}
                className={`flex-1 rounded-md border px-2 py-1.5 text-sm ${
                  type === t.key
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this?"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">Link (optional)</span>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
              />
              {type === 'article' && (
                <button
                  type="button"
                  onClick={fetchContent}
                  disabled={fetching || !url.trim()}
                  className="flex-none rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-40"
                >
                  {fetching ? 'Fetching…' : 'Fetch'}
                </button>
              )}
            </div>
          </div>

          {type === 'article' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-600">Content (Markdown)</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Fetched article content…"
                className="rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm focus:border-neutral-400 focus:outline-none"
              />
            </label>
          )}

          {type !== 'article' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-600">
                {type === 'video' ? 'Video file (optional)' : 'Audio file (optional)'}
              </span>
              {fileUrl ? (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <span className="min-w-0 flex-1 truncate">{fileUrl}</span>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={type === 'video' ? 'video/*' : 'audio/*'}
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                  {uploading ? 'Uploading…' : `Upload a ${type} file`}
                </label>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Summary, transcript, thoughts…"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-600">Deck</span>
            <DeckPicker value={formDeckId} onChange={(v) => setFormDeckId(v ?? null)} />
          </label>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {error && !showForm && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="py-16 text-center text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No media here yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span aria-hidden className="text-neutral-400">
                    {typeMeta(m.type).icon}
                  </span>
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-medium text-neutral-900 underline-offset-2 hover:underline"
                    >
                      {m.title}
                    </a>
                  ) : (
                    <span className="truncate font-medium text-neutral-900">{m.title}</span>
                  )}
                  {m.deckName && (
                    <span className="flex-none rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                      {m.deckName}
                    </span>
                  )}
                </p>
                {m.notes && <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{m.notes}</p>}
                {m.type === 'article' && m.content && (
                  <div className="mt-1.5">
                    <button
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                      className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
                    >
                      {expandedId === m.id ? 'Hide' : 'Read'}
                    </button>
                    {expandedId === m.id && (
                      <div className="mt-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                        <ArticleReader markdown={m.content} onAddCard={(w) => openAddCard(w, m.deckId)} />
                      </div>
                    )}
                  </div>
                )}
                {m.type === 'video' && m.fileUrl && (
                  <video src={m.fileUrl} controls className="mt-2 max-h-56 w-full rounded-lg" />
                )}
                {m.type === 'audio' && m.fileUrl && (
                  <audio src={m.fileUrl} controls className="mt-2 w-full" />
                )}
              </div>
              <div className="flex flex-none items-center gap-2 pt-0.5">
                <button onClick={() => openEdit(m)} className="text-xs text-neutral-400 hover:text-neutral-700">
                  Edit
                </button>
                <button onClick={() => remove(m)} className="text-xs text-red-400 hover:text-red-600">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setCardOpen(false)}
        >
          <form
            onSubmit={saveCard}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
          >
            <h3 className="mb-4 text-sm font-semibold text-neutral-700">Add card</h3>

            <label className="mb-3 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-600">Front (question)</span>
              <input
                value={cardFront}
                onChange={(e) => setCardFront(e.target.value)}
                className="rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
              />
            </label>

            <label className="mb-3 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-600">Back (answer)</span>
              <textarea
                value={cardBack}
                onChange={(e) => setCardBack(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Definition…"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-base focus:border-neutral-400 focus:outline-none"
              />
            </label>

            <label className="mb-4 flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-600">Deck</span>
              <DeckPicker value={cardDeckId} onChange={(v) => setCardDeckId(v ?? null)} />
            </label>

            {cardError && (
              <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {cardError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCardOpen(false)}
                className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:border-neutral-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCard || !cardBack.trim()}
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
              >
                {savingCard ? 'Saving…' : 'Save card'}
              </button>
            </div>
          </form>
        </div>
      )}

      {addedMsg && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg">
          {addedMsg}
        </div>
      )}
    </div>
  );
}
