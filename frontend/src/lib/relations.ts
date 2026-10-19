import type { Relation } from '../types';

/** Escape card text for use inside a Mermaid quoted label. */
function esc(s: string, max = 48): string {
  const t = s
    .replace(/\\/g, '')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>')
    .replace(/\r/g, '');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Build a Mermaid `flowchart` source string from card relations.
 *
 * Every card that participates in a relation becomes a node (labelled with its
 * front). A relation is a solid `source --> target` edge labelled with its
 * `label`. When a relation is *described by* another card (`relationCard`),
 * that card is drawn too and a dotted `describes` edge points back at the
 * source of the link it annotates.
 */
export function relationsToMermaid(relations: Relation[]): string {
  // Gather every card once, in stable encounter order.
  const cards = new Map<string, string>();
  for (const r of relations) {
    if (r.sourceCard) cards.set(r.sourceCard.id, r.sourceCard.front);
    if (r.targetCard) cards.set(r.targetCard.id, r.targetCard.front);
    if (r.relationCard) cards.set(r.relationCard.id, r.relationCard.front);
  }

  const nid = new Map<string, string>();
  let i = 0;
  for (const id of cards.keys()) nid.set(id, `n${i++}`);

  const lines: string[] = ['flowchart TD'];

  for (const [id, front] of cards) {
    lines.push(`  ${nid.get(id)}["${esc(front)}"]`);
  }

  for (const r of relations) {
    const s = r.sourceCard && nid.get(r.sourceCard.id);
    const t = r.targetCard && nid.get(r.targetCard.id);
    if (!s || !t) continue;

    if (r.label) lines.push(`  ${s} -->|"${esc(r.label)}"| ${t}`);
    else lines.push(`  ${s} --> ${t}`);

    if (r.relationCard) {
      const c = nid.get(r.relationCard.id);
      if (c) lines.push(`  ${c} -. describes .-> ${s}`);
    }
  }

  return lines.join('\n');
}
