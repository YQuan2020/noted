/**
 * Build a Cambridge Dictionary lookup URL for a card front, when the front is a
 * plain word or short phrase rather than a full question or sentence. Returns
 * `null` when it doesn't look like a lookup-able word/phrase.
 */
export function cambridgeUrl(front: string): string | null {
  const t = front.trim();
  if (!t) return null;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return null;
  // Skip questions/sentences (trailing punctuation) and anything with
  // characters a dictionary headword wouldn't contain.
  if (/[.?!:;]\s*$/.test(t)) return null;
  if (!/^[A-Za-z0-9'’\-& ]+$/.test(t)) return null;

  const slug = t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return null;

  return `https://dictionary.cambridge.org/us/dictionary/english/${slug}`;
}
