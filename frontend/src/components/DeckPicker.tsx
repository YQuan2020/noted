import { useDecks } from '../hooks/useDecks';

/**
 * A deck selector.
 * - With `includeAll` (list filtering): value `undefined` = All, `null` = Unfiled, string = deck.
 * - Without `includeAll` (assignment): value `null` = Unfiled, string = deck.
 */
export default function DeckPicker({
  value,
  onChange,
  includeAll = false,
  className = '',
}: {
  value: string | null | undefined;
  onChange: (v: string | null | undefined) => void;
  includeAll?: boolean;
  className?: string;
}) {
  const { decks, stats } = useDecks();

  const selectValue = value === undefined ? 'all' : value === null ? 'none' : value;

  const handle = (raw: string) => {
    if (raw === 'all') onChange(undefined);
    else if (raw === 'none') onChange(null);
    else onChange(raw);
  };

  return (
    <select
      value={selectValue}
      onChange={(e) => handle(e.target.value)}
      className={`rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none ${className}`}
    >
      {includeAll && (
        <option value="all">All decks{stats ? ` (${stats.total.cardCount})` : ''}</option>
      )}
      <option value="none">Unfiled{stats ? ` (${stats.unfiled.cardCount})` : ''}</option>
      {decks.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name} ({d.cardCount})
        </option>
      ))}
    </select>
  );
}
