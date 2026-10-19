export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface Card {
  id: string;
  front: string;
  back: string;
  mermaid: string | null;
  imageId: string | null;
  imageUrl: string | null;
  deckId: string | null;
  due: string | null;
  intervalDays: number;
  ease: number;
  reps: number;
  createdAt: string;
  updatedAt: string;
}

export interface Deck {
  id: string;
  name: string;
  cardCount: number;
  dueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DecksResponse {
  decks: Deck[];
  stats: {
    total: { cardCount: number; dueCount: number };
    unfiled: { cardCount: number; dueCount: number };
  };
}

export interface ImageRecord {
  id: string;
  url: string | null;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Relation {
  id: string;
  label: string | null;
  createdAt: string;
  sourceCard: { id: string; front: string; imageUrl: string | null } | null;
  targetCard: { id: string; front: string; imageUrl: string | null } | null;
  relationCard: {
    id: string;
    front: string;
    back: string;
    imageUrl: string | null;
  } | null;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';
