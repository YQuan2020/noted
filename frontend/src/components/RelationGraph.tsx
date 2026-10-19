import type { Relation } from '../types';
import { relationsToMermaid } from '../lib/relations';
import Mermaid from './Mermaid';

/** Render the given card relations as a Mermaid graph. */
export default function RelationGraph({ relations }: { relations: Relation[] }) {
  if (relations.length === 0) return null;
  return <Mermaid code={relationsToMermaid(relations)} />;
}
