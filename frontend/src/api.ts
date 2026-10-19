import type { Card, Deck, DecksResponse, Grade, ImageRecord, Relation, User } from './types';

const USER_KEY = 'noted.user';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = getStoredUser();
  const headers = new Headers(init.headers);
  if (user) headers.set('X-User-Id', user.id);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const api = {
  createUser: (username: string) =>
    request<{ user: User; created: boolean }>('/users', jsonInit('POST', { username })),

  getMe: () => request<{ user: User }>('/users/me'),

  listCards: (q?: string, deckId?: string | null) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (deckId === null) p.set('deckId', 'none');
    else if (deckId) p.set('deckId', deckId);
    const s = p.toString();
    return request<{ cards: Card[] }>(`/cards${s ? `?${s}` : ''}`);
  },

  getReview: (deckId?: string | null, limit = 20) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (deckId === null) p.set('deckId', 'none');
    else if (deckId) p.set('deckId', deckId);
    return request<{ cards: Card[]; total: number }>(`/cards/review?${p.toString()}`);
  },

  getCard: (id: string) => request<{ card: Card }>(`/cards/${id}`),

  createCard: (data: {
    front: string;
    back: string;
    mermaid?: string | null;
    imageId?: string | null;
    deckId?: string | null;
  }) => request<{ card: Card }>('/cards', jsonInit('POST', data)),

  importCards: (
    cards: Array<{ front: string; back: string; mermaid?: string | null }>,
    deckId?: string | null,
  ) =>
    request<{ imported: number; skipped: number; errors: Array<{ index: number; error: string }> }>(
      '/cards/import',
      jsonInit('POST', { cards, deckId }),
    ),

  updateCard: (
    id: string,
    data: {
      front?: string;
      back?: string;
      mermaid?: string | null;
      imageId?: string | null;
      deckId?: string | null;
    },
  ) => request<{ card: Card }>(`/cards/${id}`, jsonInit('PUT', data)),

  deleteCard: (id: string) => request<void>(`/cards/${id}`, { method: 'DELETE' }),

  reviewCard: (id: string, grade: Grade) =>
    request<{ card: Card }>(`/cards/${id}/review`, jsonInit('POST', { grade })),

  listDecks: () => request<DecksResponse>('/decks'),

  createDeck: (name: string) => request<{ deck: Deck }>('/decks', jsonInit('POST', { name })),

  renameDeck: (id: string, name: string) =>
    request<{ deck: Deck }>(`/decks/${id}`, jsonInit('PUT', { name })),

  deleteDeck: (id: string) => request<void>(`/decks/${id}`, { method: 'DELETE' }),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ image: ImageRecord }>('/images', { method: 'POST', body: form });
  },

  deleteImage: (id: string) => request<void>(`/images/${id}`, { method: 'DELETE' }),

  listRelations: (cardId?: string) =>
    request<{ relations: Relation[] }>(
      `/relations${cardId ? `?cardId=${encodeURIComponent(cardId)}` : ''}`,
    ),

  createRelation: (data: {
    sourceCardId: string;
    targetCardId: string;
    relationCardId?: string | null;
    label?: string | null;
  }) => request<{ relation: Relation }>('/relations', jsonInit('POST', data)),

  deleteRelation: (id: string) => request<void>(`/relations/${id}`, { method: 'DELETE' }),
};
