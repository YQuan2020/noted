import type { RootOrigin, WordPart } from '../types';

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

/**
 * Optional etymology for a `root` word part: the language family the root
 * comes from.
 */
export const ROOT_ORIGINS: { key: RootOrigin; label: string }[] = [
  { key: 'latin', label: 'Latin' },
  { key: 'greek', label: 'Greek' },
  { key: 'germanic', label: 'Germanic' },
  { key: 'oldEnglish', label: 'Old English' },
];

export function rootOriginLabel(key: RootOrigin): string {
  return ROOT_ORIGINS.find((o) => o.key === key)?.label ?? key;
}
