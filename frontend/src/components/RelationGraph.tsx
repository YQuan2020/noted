import type { MouseEvent } from 'react';
import type { Relation } from '../types';
import { relationsToMermaid } from '../lib/relations';
import Mermaid from './Mermaid';

/**
 * Render the given card relations as a Mermaid graph. When `onOpen` is
 * provided, each node is clickable and opens its card.
 */
export default function RelationGraph({
  relations,
  onOpen,
}: {
  relations: Relation[];
  onOpen?: (cardId: string) => void;
}) {
  if (relations.length === 0) return null;

  // Mermaid renders each node as an <a href="#card/<id>">; intercept those
  // clicks so navigation stays inside the app instead of changing the URL.
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onOpen) return;
    const a = (e.target as Element).closest('a');
    if (!a) return;
    const href = a.getAttribute('href') ?? a.getAttribute('xlink:href') ?? '';
    const m = href.match(/^#card\/(.+)$/);
    if (m) {
      e.preventDefault();
      onOpen(decodeURIComponent(m[1]));
    }
  };

  return (
    <div onClick={handleClick} className="[&_a]:cursor-pointer">
      <Mermaid code={relationsToMermaid(relations)} />
    </div>
  );
}
