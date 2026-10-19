import type { WordPart } from '../types';

interface WordPartMeta {
  key: WordPart;
  label: string;
  icon: string;
  /** Tailwind classes for a small identifying badge. */
  badge: string;
}

/**
 * A card front can be marked as a morphological word part — a root, prefix or
 * suffix — which is how the user tags etymology/vocabulary cards.
 */
export const WORD_PARTS: WordPartMeta[] = [
  {
    key: 'root',
    label: 'Root',
    icon: '√',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    key: 'prefix',
    label: 'Prefix',
    icon: '‹',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    key: 'suffix',
    label: 'Suffix',
    icon: '›',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
  },
];

export function wordPartMeta(key: WordPart): WordPartMeta {
  return WORD_PARTS.find((p) => p.key === key)!;
}
